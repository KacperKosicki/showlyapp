// routes/billing.js
const express = require("express");
const Stripe = require("stripe");

const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const Profile = require("../models/Profile");

const {
  getPublicBilling,
  getEffectivePlanKey,
  getPlan,
} = require("../config/plans");

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.warn("⚠️ Brak STRIPE_SECRET_KEY w env!");
}

const stripe = new Stripe(stripeSecret);

// Jednorazowe przedłużenie profilu
const RENEW_WINDOW_DAYS = Number(process.env.RENEW_WINDOW_DAYS ?? 7);
const DURATION_DAYS = Number(process.env.DURATION_DAYS ?? 30);

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];
const PAID_PLANS = ["standard", "premium"];

const addDays = (date, days) =>
  new Date(date.getTime() + Number(days) * 24 * 60 * 60 * 1000);

const cleanFrontendUrl = () => {
  const frontendUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");

  if (!frontendUrl) {
    throw new Error("Brak FRONTEND_URL w env");
  }

  return frontendUrl;
};

const getSubscriptionPriceId = (plan) => {
  const priceMap = {
    standard: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  };

  return priceMap[plan] || "";
};

const getOrCreateStripeCustomer = async (profile, uid) => {
  if (profile?.billing?.stripeCustomerId) {
    return profile.billing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    metadata: {
      uid,
      profileId: String(profile._id),
    },
  });

  profile.billing = {
    ...(profile.billing || {}),
    stripeCustomerId: customer.id,
  };

  await profile.save();

  return customer.id;
};

// ------------------------------------
// POST /api/billing/checkout-extension
// Jednorazowe przedłużenie widoczności profilu
// TYLKO dla Free / braku aktywnej subskrypcji
// ------------------------------------
router.post("/checkout-extension", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");

    if (!uid) {
      return res.status(401).json({ error: "Brak autoryzacji" });
    }

    const priceId = process.env.STRIPE_PRICE_EXTENSION_30D;

    if (!priceId) {
      return res.status(500).json({
        error: "Brak STRIPE_PRICE_EXTENSION_30D w env",
      });
    }

    const frontendUrl = cleanFrontendUrl();

    const profile = await Profile.findOne({ userId: uid });

    if (!profile) {
      return res.status(404).json({ error: "Profil nie istnieje" });
    }

    /**
     * OPCJA A:
     * Jeżeli użytkownik ma aktywny Standard/Premium,
     * nie pozwalamy kupować osobnego przedłużenia widoczności,
     * bo widoczność odnawia się automatycznie z subskrypcją.
     */
    if (
      PAID_PLANS.includes(profile.billing?.plan) &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.billing?.status)
    ) {
      return res.status(409).json({
        error:
          "Masz aktywną subskrypcję — widoczność profilu odnawia się automatycznie razem z planem.",
      });
    }

    const now = new Date();
    const visibleUntil = profile.visibleUntil
      ? new Date(profile.visibleUntil)
      : new Date(0);

    console.log("💰 CHECKOUT EXTENSION HIT", {
      uid,
      renewWindowDays: RENEW_WINDOW_DAYS,
      now: now.toISOString(),
      visibleUntil: visibleUntil.toISOString(),
      allowUntil: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
    });

    if (visibleUntil > addDays(now, RENEW_WINDOW_DAYS)) {
      return res.status(409).json({
        error: `Możesz przedłużyć profil dopiero, gdy zostanie maksymalnie ${RENEW_WINDOW_DAYS} dni widoczności.`,
        renewWindowDays: RENEW_WINDOW_DAYS,
        now: now.toISOString(),
        visibleUntil: visibleUntil.toISOString(),
        allowWhenVisibleUntilIsBefore: addDays(now, RENEW_WINDOW_DAYS).toISOString(),
      });
    }

    const customerId = await getOrCreateStripeCustomer(profile, uid);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success?type=extension`,
      cancel_url: `${frontendUrl}/billing/cancel?type=extension`,
      client_reference_id: uid,
      metadata: {
        uid,
        profileId: String(profile._id),
        kind: "extension",
        daysToAdd: String(DURATION_DAYS),
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("❌ checkout-extension error:", err);

    return res.status(500).json({
      error: err?.message || "Błąd serwera",
    });
  }
});

// ------------------------------------
// POST /api/billing/checkout-subscription
// Zakup planu Standard/Premium
// ------------------------------------
router.post("/checkout-subscription", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");

    if (!uid) {
      return res.status(401).json({ error: "Brak autoryzacji" });
    }

    const plan = String(req.body?.plan || "").trim();

    if (!PAID_PLANS.includes(plan)) {
      return res.status(400).json({
        error: "Nieprawidłowy plan. Dostępne plany: standard, premium.",
      });
    }

    const priceId = getSubscriptionPriceId(plan);

    if (!priceId) {
      return res.status(500).json({
        error: `Brak priceId dla planu ${plan} w env.`,
      });
    }

    const frontendUrl = cleanFrontendUrl();

    const profile = await Profile.findOne({ userId: uid });

    if (!profile) {
      return res.status(404).json({
        error: "Profil nie istnieje.",
      });
    }

    if (
      profile.billing?.stripeSubscriptionId &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.billing?.status)
    ) {
      return res.status(409).json({
        error: "Masz już aktywną subskrypcję. Zarządzaj nią w panelu płatności.",
      });
    }

    const customerId = await getOrCreateStripeCustomer(profile, uid);

    profile.billing = {
      ...(profile.billing || {}),
      plan,
      status: "pending",
      stripeCustomerId: customerId,
      stripePriceId: priceId,
    };

    await profile.save();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success?type=subscription&plan=${plan}`,
      cancel_url: `${frontendUrl}/billing/cancel?type=subscription&plan=${plan}`,
      client_reference_id: uid,
      metadata: {
        uid,
        profileId: String(profile._id),
        kind: "subscription",
        plan,
      },
      subscription_data: {
        metadata: {
          uid,
          profileId: String(profile._id),
          kind: "subscription",
          plan,
        },
      },
    });

    return res.json({
      url: session.url,
      plan,
    });
  } catch (err) {
    console.error("❌ checkout-subscription error:", err);

    return res.status(500).json({
      error: err?.message || "Błąd serwera",
    });
  }
});

// ------------------------------------
// POST /api/billing/portal
// Panel Stripe do zarządzania subskrypcją
// ------------------------------------
router.post("/portal", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");

    if (!uid) {
      return res.status(401).json({ error: "Brak autoryzacji" });
    }

    const frontendUrl = cleanFrontendUrl();

    const profile = await Profile.findOne({ userId: uid }).select(
      "userId billing"
    );

    if (!profile) {
      return res.status(404).json({
        error: "Profil nie istnieje.",
      });
    }

    const customerId = profile.billing?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({
        error: "Ten profil nie ma jeszcze klienta Stripe.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/profil?billing=portal-return`,
    });

    return res.json({
      url: session.url,
    });
  } catch (err) {
    console.error("❌ billing portal error:", err);

    return res.status(500).json({
      error: err?.message || "Błąd serwera",
    });
  }
});

// ------------------------------------
// GET /api/billing/status
// Status widoczności, planu, limitów i subskrypcji
// ------------------------------------
router.get("/status", requireAuth, async (req, res) => {
  try {
    const uid = String(req.auth?.uid || "");

    if (!uid) {
      return res.status(401).json({ error: "Brak autoryzacji" });
    }

    const profile = await Profile.findOne({ userId: uid }).select(
      "userId visibleUntil isVisible billing photos services links quickAnswers description bookingMode team"
    );

    if (!profile) {
      return res.status(404).json({
        error: "Profil nie istnieje",
      });
    }

    const now = new Date();

    const visibleUntil = profile.visibleUntil
      ? new Date(profile.visibleUntil)
      : new Date(0);

    const publicBilling = getPublicBilling(profile);

    const hasActivePaidSubscription =
      PAID_PLANS.includes(publicBilling?.effectivePlan) &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(publicBilling?.status);

    /**
     * Dla aktywnego Standard/Premium nie pokazujemy opcji ręcznego przedłużenia,
     * bo widoczność idzie z subskrypcji.
     */
    const canExtend =
      !hasActivePaidSubscription &&
      visibleUntil <= addDays(now, RENEW_WINDOW_DAYS);

    const effectivePlanKey = getEffectivePlanKey(profile, {
      allowPastDue: true,
    });

    const effectivePlan = getPlan(effectivePlanKey);

    const usage = {
      photos: Array.isArray(profile.photos) ? profile.photos.length : 0,
      services: Array.isArray(profile.services) ? profile.services.length : 0,
      links: Array.isArray(profile.links)
        ? profile.links.filter((link) => String(link || "").trim() !== "").length
        : 0,
      quickAnswers: Array.isArray(profile.quickAnswers)
        ? profile.quickAnswers.filter((qa) => qa?.title || qa?.answer).length
        : 0,
      descriptionLength: String(profile.description || "").length,
    };

    return res.json({
      now: now.toISOString(),

      visibility: {
        isVisible: !!profile.isVisible && visibleUntil > now,
        rawIsVisible: !!profile.isVisible,
        visibleUntil: visibleUntil.toISOString(),
        canExtend,
        renewWindowDays: RENEW_WINDOW_DAYS,
        durationDays: DURATION_DAYS,
        autoRenewedBySubscription: hasActivePaidSubscription,
      },

      billing: publicBilling,

      plan: {
        effectivePlan: effectivePlanKey,
        label: effectivePlan.label,
        priceLabel: effectivePlan.priceLabel,
        description: effectivePlan.description,
        features: effectivePlan.features,
        limits: effectivePlan.limits,
      },

      usage,

      legacy: {
        canExtend,
        visibleUntil: visibleUntil.toISOString(),
        renewWindowDays: RENEW_WINDOW_DAYS,
        durationDays: DURATION_DAYS,
        autoRenewedBySubscription: hasActivePaidSubscription,
      },
    });
  } catch (err) {
    console.error("❌ billing status error:", err);

    return res.status(500).json({
      error: err?.message || "Błąd serwera",
    });
  }
});

module.exports = router;