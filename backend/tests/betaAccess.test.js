const test = require('node:test');
const assert = require('node:assert/strict');
const { runWithSettings, isBetaPremiumEnabled, isProfileVisible, betaVisibility, checkoutBlocked, visibleProfileQuery } = require('../utils/betaAccess');
const { getEffectivePlanKey, getPublicBilling, hasFeature, getLimit } = require('../config/plans');

test('beta grants full Premium to new and existing profiles without changing billing or deadlines', () => {
  const profile = { billing: { plan: 'free', status: 'inactive' }, isVisible: false, visibilityBlockedByAdmin: false, visibleUntil: '2020-01-01' };
  const original = JSON.stringify(profile);
  runWithSettings({ betaPremiumEnabled: true }, () => {
    for (const p of [{}, profile]) {
      assert.equal(getEffectivePlanKey(p), 'premium');
      assert.equal(hasFeature(p, 'booking'), true);
      assert.equal(hasFeature(p, 'team'), true);
      assert.equal(getLimit(p, 'photos'), 15);
      assert.equal(getPublicBilling(p).status, 'beta');
      assert.equal(getPublicBilling(p).currentPeriodEnd, null);
    }
    assert.equal(isProfileVisible(profile), true);
    assert.deepEqual(betaVisibility(profile), { isVisible: true, visibleUntil: null });
    assert.match(checkoutBlocked(), /bezpłatne/);
  });
  assert.equal(JSON.stringify(profile), original);
  runWithSettings({ betaPremiumEnabled: false }, () => {
    assert.equal(getEffectivePlanKey(profile), 'free');
    assert.equal(isProfileVisible(profile), false);
    assert.equal(checkoutBlocked(), null);
    assert.deepEqual(betaVisibility(profile), {});
  });
});

test('beta never lifts explicit or legacy moderation blocks', () => {
  runWithSettings({ betaPremiumEnabled: true }, () => {
    assert.equal(isProfileVisible({ isVisible: false, visibilityBlockedByAdmin: true }), false);
    assert.equal(isProfileVisible({ isVisible: false, visibleUntil: '2099-01-01' }), false);
    assert.equal(isProfileVisible({ isVisible: false, visibleUntil: '2020-01-01' }), true);
    assert.equal(visibleProfileQuery().visibilityBlockedByAdmin.$ne, true);
  });
});

test('disabling beta restores the actual paid plan, not a made-up subscription', () => {
  const p = { billing: { plan: 'standard', status: 'active', currentPeriodEnd: '2099-01-01' } };
  runWithSettings({ betaPremiumEnabled: true }, () => assert.equal(getEffectivePlanKey(p), 'premium'));
  runWithSettings({ betaPremiumEnabled: false }, () => {
    assert.equal(getEffectivePlanKey(p), 'standard');
    assert.equal(getPublicBilling(p).currentPeriodEnd, '2099-01-01');
  });
});

test('concurrent requests and background tasks cannot inherit somebody else’s beta setting', async () => {
  await Promise.all([true, false].map(enabled => runWithSettings({ betaPremiumEnabled: enabled }, async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(isBetaPremiumEnabled(), enabled);
    assert.equal(getEffectivePlanKey({}), enabled ? 'premium' : 'free');
  })));
  assert.equal(isBetaPremiumEnabled(), false);
});

test('test Stripe subscriptions do not grant a paid plan when live payments are configured', () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_live_unit_test_only';
  try {
    const p = { billing: { plan: 'premium', status: 'active', paymentEnvironment: 'test' } };
    assert.equal(getEffectivePlanKey(p), 'free');
    runWithSettings({ betaPremiumEnabled: true }, () => assert.equal(getEffectivePlanKey(p), 'premium'));
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previous;
  }
});
