const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageBillingSubscription } = require('../utils/billingPortalAccess');
const profile = environment => ({ billing: { stripeCustomerId: 'cus_example', stripeSubscriptionId: 'sub_example', paymentEnvironment: environment } });
const options = (betaEnabled, live) => ({ betaEnabled, stripeAvailable: true, stripeSecret: live ? 'sk_live_fixture' : 'sk_test_fixture' });

test('beta hides test and unverified subscription portals, including legacy test customers', () => {
  for (const environment of ['test', undefined, 'live']) {
    assert.equal(canManageBillingSubscription(profile(environment), options(true, false)), false);
  }
  assert.equal(canManageBillingSubscription(profile('test'), options(true, true)), false);
  assert.equal(canManageBillingSubscription(profile(undefined), options(true, true)), false);
});
test('beta blocks the portal for live subscriptions too', () => {
  assert.equal(canManageBillingSubscription(profile('live'), options(true, true)), false);
});
test('ending beta restores matching test and live portals but never mixes their customers', () => {
  assert.equal(canManageBillingSubscription(profile('test'), options(false, false)), true);
  assert.equal(canManageBillingSubscription(profile('live'), options(false, true)), true);
  assert.equal(canManageBillingSubscription(profile('test'), options(false, true)), false);
  assert.equal(canManageBillingSubscription({ billing: { stripeSubscriptionId: 'sub_example' } }, options(false, true)), false);
  assert.equal(canManageBillingSubscription(profile('live'), { ...options(false, true), stripeAvailable: false }), false);
});
