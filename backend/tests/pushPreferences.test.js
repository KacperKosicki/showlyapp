const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
let preferences, calls, fail;
const original = Module._load;
let sendPushToUserUid;
try {
  Module._load = function (name, parent, ...rest) {
    if (/[\\/]utils[\\/]sendPushNotification.js$/.test(parent?.filename || '')) {
      if (name === './firebaseAdmin') return { messaging: () => ({ sendEachForMulticast: async () => { calls++; if (fail) throw new Error('Offline'); return { successCount: 1, failureCount: 0, responses: [{ success: true }] }; } }) };
      if (name === '../models/User') return { findOne: () => ({ select() { return this; }, lean: async () => ({ pushTokens: ['device-token'], notificationPreferences: preferences }) }) };
    }
    return original.call(this, name, parent, ...rest);
  };
  ({ sendPushToUserUid } = require('../utils/sendPushNotification'));
} finally { Module._load = original; }
test.beforeEach(() => { preferences = {}; calls = 0; fail = false; });
test('turning off booking pushes does not disable message pushes', async () => {
  preferences = { reservationUpdates: false };
  assert.equal((await sendPushToUserUid('client', { title: 'Accepted', category: 'reservationUpdates' })).reason, 'disabled-by-user');
  assert.equal(calls, 0);
  assert.equal((await sendPushToUserUid('client', { title: 'Message', category: 'messages' })).ok, true);
  assert.equal(calls, 1);
});
test('transport errors return a delivery result instead of rejecting an already saved action', async () => {
  fail = true;
  assert.equal((await sendPushToUserUid('client', { title: 'Accepted', category: 'reservationUpdates' })).reason, 'delivery-failed');
});
