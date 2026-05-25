// routes/billingWebhook.js
const express = require("express");
const Stripe = require("stripe");

const router = express.Router();

const Profile = require("../models/Profile");
const BillingEvent = require("../models/BillingEvent");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) {
  console.warn("⚠️ Brak STRIPE_SECRET_KEY w env!");
}

if (!webhookSecret) {
  console.warn("⚠️ Brak STRIPE_WEBHOOK_SECRET w env!");
}

const stripe = new Stripe(stripeSecret);

const DURATION_DAYS = Number(process.env.DURATION_DAYS ?? 30);
const MAX_FORWARD_DAYS = Number(process.env.MAX_FORWARD_DAYS ?? 37);

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

const createBillingEvent = async (event) => {
  try {
    const object = event?.data?.object || {};

    await BillingEvent.create({
      eventId: event.id,
      type: event.type,
      objectId: String(object.id || ""),
      livemode: !!event.livemode,
      status: "received",
      metadata: {
        objectType: object.object || "",
      },
    });

    return true;
  } catch (err) {
    if (err?.code === 11000) {
      return false;
    }

    throw err;
  }
};

const updateBillingEvent = async (eventId, update = {}) => {
  try {
    await BillingEvent.findOneAndUpdate(
      { eventId },
      {
        ...update,
        processedAt: new Date(),
      },
      { new: true }
    );
  } catch (err) {
    console.error("❌ updateBillingEvent error:", err);
  }
};

const applySubscriptionToProfile = async (subscription, fallback = {}) => {
  const uid = String(subscription?.metadata?.uid || fallback.uid || "");
  const profileId = String(subscription?.metadata?.profileId || fallback.profileId || "");

  const priceId = getSubscriptionMainPriceId(subscription);

  const plan = String(
    subscription?.metadata?.plan ||
      fallback.plan ||
      getPlanFromPriceId(priceId)
  );

  if (!uid && !profileId) {
    return {
      ok: false,
      reason: "Brak uid/profileId w metadata subskrypcji.",
    };
  }

  if (!["standard", "premium"].includes(plan)) {
    return {
      ok: false,
      reason: "Nieprawidłowy plan subskrypcji.",
      uid,
      profileId,
      plan,
      priceId,
    };
  }

  const profile = uid
    ? await Profile.findOne({ userId: uid })
    : await Profile.findById(profileId);

  if (!profile) {
    return {
      ok: false,
      reason: "Nie znaleziono profilu.",
      uid,
      profileId,
      plan,
    };
  }

  const status = String(subscription.status || "inactive");

  profile.billing = {
    ...(profile.billing || {}),
    plan,
    status,
    stripeCustomerId: String(subscription.customer || profile.billing?.stripeCustomerId || ""),
    stripeSubscriptionId: String(subscription.id || ""),
    stripePriceId: priceId,
    currentPeriodStart: unixToDate(subscription.current_period_start),
    currentPeriodEnd: unixToDate(subscription.current_period_end),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    lastPaymentAt: ["active", "trialing"].includes(status)
      ? new Date()
      : profile.billing?.lastPaymentAt || null,
  };

  if (["active", "trialing", "past_due"].includes(status)) {
    profile.isVisible = true;

    if (subscription.current_period_end) {
      profile.visibleUntil = unixToDate(subscription.current_period_end);
    }
  }

  await profile.save();

  return {
    ok: true,
    uid: profile.userId,
    profileId: String(profile._id),
    plan,
    status,
    priceId,
  };
};

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

  profile.visibleUntil = nextVisibleUntil;
  profile.isVisible = true;

  if (session.customer) {
    profile.billing = {
      ...(profile.billing || {}),
      stripeCustomerId: String(session.customer),
    };
  }

  await profile.save();

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
  });

  return {
    ok: true,
    uid: profile.userId,
    plan: "free",
    status: "canceled",
  };
};

const handleInvoicePaid = async (invoice) => {
  const subscriptionId = String(invoice.subscription || "");

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
  const subscriptionId = String(invoice.subscription || "");

  if (!subscriptionId) {
    return {
      ok: true,
      skipped: true,
      reason: "invoice.payment_failed bez subscriptionId.",
    };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

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

  profile.billing = {
    ...(profile.billing || {}),
    status: "past_due",
    stripeCustomerId: String(subscription.customer || profile.billing?.stripeCustomerId || ""),
    stripeSubscriptionId: String(subscription.id || ""),
    stripePriceId: getSubscriptionMainPriceId(subscription),
    currentPeriodStart: unixToDate(subscription.current_period_start),
    currentPeriodEnd: unixToDate(subscription.current_period_end),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    lastPaymentFailedAt: new Date(),
    graceUntil: addDays(new Date(), 7),
  };

  await profile.save();

  console.log("⚠️ Płatność subskrypcji nieudana:", {
    uid: profile.userId,
    status: "past_due",
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
      if (!webhookSecret) {
        console.error("❌ Brak STRIPE_WEBHOOK_SECRET w env!");
        return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
      }

      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
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
          result = await applySubscriptionToProfile(event.data.object);
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

      return res.json({
        received: true,
        result,
      });
    } catch (err) {
      console.error("❌ Webhook handler error:", err);

      if (event?.id) {
        await updateBillingEvent(event.id, {
          status: "failed",
          errorMessage: err?.message || "Webhook handler error.",
        });
      }

      return res.status(500).send("Webhook handler error");
    }
  }
);

module.exports = router;