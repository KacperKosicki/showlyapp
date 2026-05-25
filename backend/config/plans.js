// config/plans.js

const PLANS = {
  free: {
    label: "Free",
    priceLabel: "0 zł",
    description: "Podstawowa wizytówka na start.",
    features: {
      profile: true,
      messages: true,
      booking: false,
      requestBlocking: false,
      team: false,
      premiumThemes: false,
      advancedChat: false,
      analytics: false,
      customSlug: false,
      priorityProfile: false,
    },
    limits: {
      photos: 3,
      services: 3,
      serviceGallery: 2,
      links: 3,
      quickAnswers: 1,
      descriptionLength: 500,
    },
  },

  standard: {
    label: "Standard",
    priceLabel: "29,99 zł / mies.",
    description: "Rozbudowany profil dla twórców, freelancerów i małych usług.",
    features: {
      profile: true,
      messages: true,
      booking: false,
      requestBlocking: false,
      team: false,
      premiumThemes: true,
      advancedChat: false,
      analytics: true,
      customSlug: false,
      priorityProfile: false,
    },
    limits: {
      photos: 6,
      services: 10,
      serviceGallery: 4,
      links: 6,
      quickAnswers: 3,
      descriptionLength: 1500,
    },
  },

  premium: {
    label: "Premium",
    priceLabel: "59,99 zł / mies.",
    description: "Profil biznesowy z rezerwacjami, większą ofertą i funkcjami premium.",
    features: {
      profile: true,
      messages: true,
      booking: true,
      requestBlocking: true,
      team: true,
      premiumThemes: true,
      advancedChat: true,
      analytics: true,
      customSlug: true,
      priorityProfile: true,
    },
    limits: {
      photos: 20,
      services: 50,
      serviceGallery: 10,
      links: 10,
      quickAnswers: 10,
      descriptionLength: 3000,
    },
  },
};

const ACTIVE_STATUSES = ["active", "trialing"];
const SOFT_ACTIVE_STATUSES = ["active", "trialing", "past_due"];

function getPlan(plan = "free") {
  return PLANS[plan] || PLANS.free;
}

function getBilling(profile) {
  return profile?.billing || {};
}

function getEffectivePlanKey(profile, options = {}) {
  const billing = getBilling(profile);

  const plan = billing.plan || "free";
  const status = billing.status || "inactive";

  const allowPastDue = options.allowPastDue ?? false;

  const allowedStatuses = allowPastDue
    ? SOFT_ACTIVE_STATUSES
    : ACTIVE_STATUSES;

  if (plan === "free") return "free";

  if (!allowedStatuses.includes(status)) {
    return "free";
  }

  return PLANS[plan] ? plan : "free";
}

function getEffectivePlan(profile, options = {}) {
  return getPlan(getEffectivePlanKey(profile, options));
}

function hasFeature(profile, featureName, options = {}) {
  return !!getEffectivePlan(profile, options).features?.[featureName];
}

function getLimit(profile, limitName, options = {}) {
  return getEffectivePlan(profile, options).limits?.[limitName] ?? 0;
}

function getPlanLimits(profile, options = {}) {
  return getEffectivePlan(profile, options).limits;
}

function getPlanFeatures(profile, options = {}) {
  return getEffectivePlan(profile, options).features;
}

function isPaidPlanActive(profile) {
  return getEffectivePlanKey(profile) !== "free";
}

function getPublicBilling(profile) {
  const billing = getBilling(profile);

  const effectivePlanKey = getEffectivePlanKey(profile, {
    allowPastDue: true,
  });

  const effectivePlan = getPlan(effectivePlanKey);

  return {
    plan: billing.plan || "free",
    status: billing.status || "inactive",
    effectivePlan: effectivePlanKey,
    label: effectivePlan.label,
    priceLabel: effectivePlan.priceLabel,
    currentPeriodStart: billing.currentPeriodStart || null,
    currentPeriodEnd: billing.currentPeriodEnd || null,
    cancelAtPeriodEnd: !!billing.cancelAtPeriodEnd,
    limits: effectivePlan.limits,
    features: effectivePlan.features,
  };
}

module.exports = {
  PLANS,
  ACTIVE_STATUSES,
  SOFT_ACTIVE_STATUSES,
  getPlan,
  getEffectivePlanKey,
  getEffectivePlan,
  hasFeature,
  getLimit,
  getPlanLimits,
  getPlanFeatures,
  isPaidPlanActive,
  getPublicBilling,
};