function canManageBillingSubscription(profile, { betaEnabled, stripeAvailable, stripeSecret }) {
  if (betaEnabled) return false;
  const billing = profile?.billing || {};
  if (!stripeAvailable || !billing.stripeCustomerId || !billing.stripeSubscriptionId) return false;
  const livePayments = /^(sk|rk)_live_/.test(stripeSecret || '');
  if (livePayments && billing.paymentEnvironment === 'test') return false;
  return true;
}

module.exports = { canManageBillingSubscription };
