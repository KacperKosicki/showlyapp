const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { runWithSettings } = require('../utils/betaAccess');
const originalLoad = Module._load;
let queries = 0;
let profile = { userId: 'owner', isVisible: false, visibleUntil: new Date(0), visibilityBlockedByAdmin: false, billing: { plan: 'free', status: 'inactive' } };
let router;
try {
  Module._load = function(request, parent, ...rest) {
    if (/[\\/]routes[\\/]billing\.js$/.test(parent?.filename || '')) {
      if (request === 'stripe') return class Stripe {};
      if (request === '../middleware/requireAuth') return (req, res, next) => next();
      if (request === '../models/Profile') return { findOne: () => { queries++; return { select: async () => profile }; } };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  router = require('../routes/billing');
} finally { Module._load = originalLoad; }
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });

test('beta blocks both checkout endpoints before any profile query or Stripe action', () => {
  runWithSettings({ betaPremiumEnabled: true }, () => {
    for (const path of ['/checkout-extension', '/checkout-subscription']) {
      let advanced = false;
      const res = response();
      router.stack[0].handle({ path }, res, () => { advanced = true; });
      assert.equal(advanced, false);
      assert.equal(res.code, 409);
      assert.equal(res.data.code, 'BETA_PREMIUM_ENABLED');
    }
    assert.equal(queries, 0);
  });
});

test('billing status exposes free Premium with continuous visibility and respects moderation', async () => {
  const route = router.stack.find(layer => layer.route?.path === '/status').route;
  await runWithSettings({ betaPremiumEnabled: true }, async () => {
    for (const blocked of [false, true]) {
      profile.visibilityBlockedByAdmin = blocked;
      const res = response();
      await route.stack.at(-1).handle({ auth: { uid: 'owner' } }, res);
      assert.equal(res.code, 200);
      assert.equal(res.data.billing.effectivePlan, 'premium');
      assert.equal(res.data.billing.status, 'beta');
      assert.equal(res.data.visibility.isVisible, !blocked);
      assert.equal(res.data.visibility.visibleUntil, null);
      assert.equal(res.data.visibility.canExtend, false);
      assert.equal(res.data.payments.enabled, false);
      assert.equal(res.data.plan.limits.staff, 3);
    }
  });
});
