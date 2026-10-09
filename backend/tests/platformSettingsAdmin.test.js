const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let settings = null, role = 'user', writes = 0;
const originalLoad = Module._load;
let router;
try {
  Module._load = function(request, parent, ...rest) {
    if (/platformSettingsAdmin\.js$/.test(parent?.filename || '')) {
      if (request === '../middleware/requireAuth') return (req, res, next) => req.auth?.uid ? next() : res.status(401).json({});
      if (request === '../models/PlatformSettings') return {
        findById: () => ({ lean: async () => settings }),
        findOneAndUpdate: async (filter, update, options) => {
          assert.equal(filter._id, 'platform'); assert.equal(options.upsert, true);
          writes++; settings = { ...update.$set, updatedAt: new Date() }; return settings;
        },
      };
      if (request === '../models/Profile') return { updateMany: async () => {} };
    }
    if (/requireRole\.js$/.test(parent?.filename || '') && request === '../models/User') {
      return { findOne: async () => ({ role }) };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  router = require('../routes/platformSettingsAdmin');
} finally { Module._load = originalLoad; }

async function call(method, enabled, authenticated = true) {
  const route = router.stack.find(layer => layer.route?.path === '/beta-premium' && layer.route.methods[method]).route;
  const req = { body: { enabled }, ...(authenticated ? { auth: { uid: 'operator' } } : {}) };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  const invoke = index => route.stack[index]?.handle(req, res, () => invoke(index + 1));
  await invoke(0); return res;
}
test('only an authenticated admin can change beta access; role is read from the database', async () => {
  writes = 0;
  assert.equal((await call('patch', true, false)).code, 401);
  for (role of ['user', 'moderator']) assert.equal((await call('patch', true)).code, 403);
  assert.equal(writes, 0);
  role = 'admin';
  assert.equal((await call('patch', 'true')).code, 400);
  assert.equal(writes, 0);
  const enabled = await call('patch', true);
  assert.equal(enabled.data.enabled, true);
  assert.equal(enabled.data.updatedBy, undefined);
  assert.equal(settings.updatedBy, 'operator');
  assert.equal((await call('get')).data.enabled, true);
  assert.equal((await call('patch', false)).data.enabled, false);
  assert.equal((await call('get')).data.enabled, false);
  assert.equal(writes, 2);
});
