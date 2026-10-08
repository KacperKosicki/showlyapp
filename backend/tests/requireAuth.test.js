const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let verifyArgs, disabled = false;
const originalLoad = Module._load;
let requireAuth;
try {
  Module._load = function(request, parent, ...rest) {
    if (/[\\/]middleware[\\/]requireAuth\.js$/.test(parent?.filename || '') && request === '../utils/firebaseAdmin') {
      return { auth: () => ({ verifyIdToken: async (...args) => {
        verifyArgs = args;
        if (disabled) throw new Error('auth/user-disabled');
        return { uid: 'owner' };
      } }) };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  requireAuth = require('../middleware/requireAuth');
} finally { Module._load = originalLoad; }

test('authentication checks revocation and refuses tokens of disabled users', async () => {
  let advanced = false;
  const req = { headers: { authorization: 'Bearer token' } };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await requireAuth(req, res, () => { advanced = true; });
  assert.deepEqual(verifyArgs, ['token', true]);
  assert.equal(advanced, true);
  disabled = true; advanced = false;
  const originalError = console.error; console.error = () => {};
  try { await requireAuth(req, res, () => { advanced = true; }); }
  finally { console.error = originalError; }
  assert.equal(res.code, 401);
  assert.equal(advanced, false);
});
