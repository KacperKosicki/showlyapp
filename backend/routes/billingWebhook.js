// routes/billingWebhook.js
const express = require("express");
const Stripe = require("stripe");

const router = express.Router();

const Profile = require("../models/Profile");
const BillingEvent = require("../models/BillingEvent");
const recovery = require("../utils/billingRecovery");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) {
  console.warn("⚠️ Brak STRIPE_SECRET_KEY w env!");
}

if (!webhookSecret) {
  console.warn("⚠️ Brak STRIPE_WEBHOOK_SECRET w env!");
}

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const DURATION_DAYS = Number(process.env.DURATION_DAYS ?? 30);
const MAX_FORWARD_DAYS = Number(process.env.MAX_FORWARD_DAYS ?? 37);

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];
const PAID_PLANS = ["standard", "premium"];

const addDays = (date, days) =>
  new Date(date.getTime() + Number(days) * 24 * 60 * 60 * 1000);

const unixToDate = (value) => {
  if (!value) return null;
  return new Date(Number(value) * 1000);
};

const getPlanFromPriceId = (priceId = "") => {
  if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY) return "standard";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY) return "premium";
  return "";
};

const getSubscriptionMainPriceId = (subscription) => {
  return String(subscription?.items?.data?.[0]?.price?.id || "");
};

const { claimBillingEvent } = require("../utils/billingEvents");
const createBillingEvent = event => claimBillingEvent(BillingEvent, event);

const updateBillingEvent = async (eventId, update = {}) => {
  try {
    await BillingEvent.findOneAndUpdate(
      { eventId },
      {
        ...update,
        processedAt: new Date(),
        leaseUntil: null,
      },
      { new: true }
    );
  } catch (err) {
    console.error("❌ updateBillingEvent error:", err);
    throw err;
  }
};

/**
 * OPCJA A:
 * Subskrypcja Standard/Premium automatycznie utrzymuje widoczność profilu.
 *
 * Zasada:
 * - Nie dodajemy ręcznie +30 dni.
 * - Ustawiamy visibleUntil na current_period_end ze Stripe.
 * - Dzięki temu webhook jest idempotentny i nie nabija podwójnych dni.
 */
const applySubscriptionToProfile = (subscription, fallback = {}) => recovery.applySubscriptionToProfile(Profile, subscription, fallback);

/**
 * Jednorazowe przedłużenie widoczności.
 *
 * To zostaje tylko dla Free / braku aktywnego płatnego planu.
 */
const handleExtensionPayment = async (session) => {
  if (session.payment_status !== "paid") {
    return {
      ok: true,
      skipped: true,
      reason: "Płatność extension nie ma statusu paid.",
    };
  }

  const uid = String(session?.metadata?.uid || session?.client_reference_id || "");

  if (!uid) {
    return {
      ok: false,
      reason: "Brak uid w metadata extension.",
    };
  }

  const profile = await Profile.findOne({ userId: uid });

  if (!profile) {
    return {
      ok: false,
      reason: "Profil nie istnieje.",
      uid,
    };
  }

  /**
   * Jeśli użytkownik ma aktywny Standard/Premium,
   * nie przedłużamy ręcznie, bo widoczność odnawia się z subskrypcją.
   */
  if (
    PAID_PLANS.includes(profile.billing?.plan) &&
    ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.billing?.status)
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Profil ma aktywną subskrypcję — widoczność odnawia się automatycznie.",
      uid,
    };
  }

  const daysToAdd = Number(session?.metadata?.daysToAdd || DURATION_DAYS);

  const now = new Date();

  const currentVisibleUntil = profile.visibleUntil
    ? new Date(profile.visibleUntil)
    : now;

  const base = currentVisibleUntil > now ? currentVisibleUntil : now;

  let nextVisibleUntil = addDays(base, daysToAdd);

  const cap = addDays(now, MAX_FORWARD_DAYS);

  if (nextVisibleUntil > cap) {
    nextVisibleUntil = cap;
  }

  // Zapis okresu i identyfikatora płatności w jednym atomowym kroku.
  const fields = {
    visibleUntil: { $min: [{ $add: [{ $max: [{ $ifNull: ["$visibleUntil", now] }, now] }, daysToAdd * 86400000] }, cap] },
    appliedExtensionPayments: { $concatArrays: [{ $ifNull: ["$appliedExtensionPayments", []] }, [session.id]] },
  };
  if (!recovery.isModerationBlocked(profile, now)) fields.isVisible = { $cond: [{ $eq: ["$visibilityBlockedByAdmin", true] }, "$isVisible", true] };
  if (session.customer) fields["billing.stripeCustomerId"] = recovery.idOf(session.customer);
  const saved = await Profile.updateOne({ _id: profile._id, appliedExtensionPayments: { $ne: session.id } }, [{ $set: fields }]);
  if (!saved.modifiedCount) return { ok: true, skipped: true, uid, reason: "Ta płatność już przedłużyła profil." };

  console.log("💰 Przedłużono widoczność profilu:", {
    uid,
    visibleUntil: nextVisibleUntil.toISOString(),
  });

  return {
    ok: true,
    uid,
    kind: "extension",
    visibleUntil: nextVisibleUntil.toISOString(),
  };
};

const handleSubscriptionCheckout = async (session) => {
  const subscriptionId = String(session.subscription || "");

  if (!subscriptionId) {
    return {
      ok: false,
      reason: "Brak session.subscription.",
    };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return applySubscriptionToProfile(subscription, {
    uid: session?.metadata?.uid || session?.client_reference_id || "",
    profileId: session?.metadata?.profileId || "",
    plan: session?.metadata?.plan || "",
  });
};

const handleCheckoutCompleted = async (session) => {
  const kind = String(session?.metadata?.kind || "");

  if (session.mode === "payment" && kind === "extension") {
    return handleExtensionPayment(session);
  }

  if (session.mode === "subscription" && kind === "subscription") {
    return handleSubscriptionCheckout(session);
  }

  return {
    ok: true,
    skipped: true,
    reason: "Pominięto checkout.session.completed — nieznany kind/mode.",
    mode: session.mode,
    kind,
  };
};

const handleSubscriptionDeleted = async (subscription) => {
  const uid = String(subscription?.metadata?.uid || "");
  const profileId = String(subscription?.metadata?.profileId || "");

  if (!uid && !profileId) {
    return {
      ok: false,
      reason: "Brak uid/profileId przy customer.subscription.deleted.",
    };
  }

  const profile = uid
    ? await Profile.findOne({ userId: uid })
    : await Profile.findById(profileId);

  if (!profile) {
    return {
      ok: false,
      reason: "Nie znaleziono profilu przy anulowaniu subskrypcji.",
      uid,
      profileId,
    };
  }

  if (profile.billing?.stripeSubscriptionId && profile.billing.stripeSubscriptionId !== subscription.id) return { ok: true, skipped: true, reason: "Anulowanie starszej subskrypcji.", uid: profile.userId };

  /**
   * Po anulowaniu subskrypcji:
   * - profil wraca na Free,
   * - funkcje płatne znikają,
   * - visibleUntil zostaje bez zmian.
   *
   * Dzięki temu jeśli użytkownik ma jeszcze ważną widoczność,
   * profil nie gaśnie natychmiast.
   */
  profile.billing = {
    ...(profile.billing || {}),
    plan: "free",
    status: "canceled",
    stripeSubscriptionId: "",
    stripePriceId: "",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };

  await profile.save();

  console.log("❌ Subskrypcja anulowana, profil wraca na Free:", {
    uid: profile.userId,
    visibleUntil: profile.visibleUntil
      ? new Date(profile.visibleUntil).toISOString()
      : null,
  });

  return {
    ok: true,
    uid: profile.userId,
    plan: "free",
    status: "canceled",
    visibleUntil: profile.visibleUntil
      ? new Date(profile.visibleUntil).toISOString()
      : null,
  };
};

const handleInvoicePaid = async (invoice) => {
  const subscriptionId = recovery.getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return {
      ok: true,
      skipped: true,
      reason: "invoice.paid bez subscriptionId.",
    };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return applySubscriptionToProfile(subscription);
};

const handleInvoicePaymentFailed = async (invoice) => {
  const subscriptionId = recovery.getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return {
      ok: true,
      skipped: true,
      reason: "invoice.payment_failed bez subscriptionId.",
    };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.status !== "past_due") return applySubscriptionToProfile(subscription);

  const uid = String(subscription?.metadata?.uid || "");
  const profileId = String(subscription?.metadata?.profileId || "");

  if (!uid && !profileId) {
    return {
      ok: false,
      reason: "Brak uid/profileId przy invoice.payment_failed.",
    };
  }

  const profile = uid
    ? await Profile.findOne({ userId: uid })
    : await Profile.findById(profileId);

  if (!profile) {
    return {
      ok: false,
      reason: "Nie znaleziono profilu przy invoice.payment_failed.",
      uid,
      profileId,
    };
  }

  const currentPeriodStart = recovery.getSubscriptionPeriod(subscription).start;
  const currentPeriodEnd = recovery.getSubscriptionPeriod(subscription).end;

  profile.billing = {
    ...(profile.billing || {}),
    status: "past_due",
    paymentEnvironment: subscription.livemode ? 'live' : 'test',
    stripeCustomerId: String(
      subscription.customer || profile.billing?.stripeCustomerId || ""
    ),
    stripeSubscriptionId: String(subscription.id || ""),
    stripePriceId: getSubscriptionMainPriceId(subscription),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    lastPaymentFailedAt: new Date(),
    graceUntil: addDays(new Date(Number(invoice.created) * 1000 || Date.now()), 7),
  };

  /**
   * Przy past_due nie zmieniamy visibleUntil.
   * Jeśli Stripe jeszcze trzyma current_period_end, profil zostaje widoczny
   * zgodnie z dotychczasowym okresem / grace.
   */

  await profile.save();

  console.log("⚠️ Płatność subskrypcji nieudana:", {
    uid: profile.userId,
    status: "past_due",
    graceUntil: profile.billing?.graceUntil
      ? new Date(profile.billing.graceUntil).toISOString()
      : null,
  });

  return {
    ok: true,
    uid: profile.userId,
    status: "past_due",
  };
};

// ------------------------------------
// POST /api/billing/webhook
// ------------------------------------
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      if (!stripe || !webhookSecret) {
        console.error("❌ Brak STRIPE_WEBHOOK_SECRET w env!");
        return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
      }

      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      const liveMode = /^(sk|rk)_live_/.test(stripeSecret || '');
      if (typeof event.livemode === 'boolean' && event.livemode !== liveMode) {
        return res.status(400).send('Niezgodny tryb płatności Stripe.');
      }
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const inserted = await createBillingEvent(event);

      if (!inserted) {
        console.log("ℹ️ Duplikat eventu Stripe:", event.id);
        return res.json({
          received: true,
          duplicate: true,
        });
      }

      let result = {
        ok: true,
        skipped: true,
        reason: "Event pominięty.",
      };

      switch (event.type) {
        case "checkout.session.completed":
          result = await handleCheckoutCompleted(event.data.object);
          break;

        case "customer.subscription.updated":
          result = await applySubscriptionToProfile(await stripe.subscriptions.retrieve(event.data.object.id));
          break;

        case "customer.subscription.deleted":
          result = await handleSubscriptionDeleted(event.data.object);
          break;

        case "invoice.paid":
          result = await handleInvoicePaid(event.data.object);
          break;

        case "invoice.payment_failed":
          result = await handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          result = {
            ok: true,
            skipped: true,
            reason: `Nieobsługiwany event: ${event.type}`,
          };
          break;
      }

      if (result.ok) {
        await updateBillingEvent(event.id, {
          status: result.skipped ? "skipped" : "processed",
          uid: result.uid || "",
          plan: result.plan || "",
          metadata: result,
        });

        return res.json({
          received: true,
          result,
        });
      }

      await updateBillingEvent(event.id, {
        status: "failed",
        uid: result.uid || "",
        plan: result.plan || "",
        errorMessage: result.reason || "Webhook processing failed.",
        metadata: result,
      });

      console.error("❌ Webhook result failed:", result);

      return res.status(500).json({
        received: true,
        result,
      });
    } catch (err) {
      console.error("❌ Webhook handler error:", err);

      if (event?.id && !err.billingBusy) {
        await updateBillingEvent(event.id, {
          status: "failed",
          errorMessage: err?.message || "Webhook handler error.",
        }).catch(logError => console.error("Nie zapisano błędu webhooka:", logError.message));
      }

      return res.status(500).send("Webhook handler error");
    }
  }
);

module.exports = router;
