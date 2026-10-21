const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { markReservationUpdate, unreadReservationQuery } = require('../utils/reservationUpdates');
const { normalizePreferences, validatePreferences } = require('../utils/notificationPreferences');
let reservation, push, saved, filter, update, expireCandidates;
const query = data => ({ select() { return this; }, limit() { return this; }, lean: async () => data });
const stubs = {
  '../models/Reservation': {
    findById: async () => reservation,
    find: () => query(expireCandidates),
    findOneAndUpdate: async (where, changes) => { filter = where; update = changes; return saved ? reservation : null; },
    countDocuments: async where => { filter = where; return 2; },
  },
  '../models/Profile': { findById: async () => ({ availableDates: [] }) },
  '../models/User': {}, '../models/Staff': {},
  '../utils/sendPushNotification': { sendPushToUserUid: async (uid, data) => { push = { uid, ...data }; } },
  '../middleware/requireAuth': (req, res, next) => next(),
  '../config/plans': { hasFeature: () => true, getPublicBilling: () => ({}) },
};
const original = Module._load;
let router;
try {
  Module._load = function (name, parent, ...rest) {
    if (/[\\/]routes[\\/]reservations.js$/.test(parent?.filename || '') && stubs[name]) return stubs[name];
    return original.call(this, name, parent, ...rest);
  };
  router = require('../routes/reservations');
} finally { Module._load = original; }
async function call(method, path, uid, body = {}) {
  const route = router.stack.find(item => item.route?.path === path && item.route.methods[method]).route;
  const req = { auth: { uid }, params: { id: 'booking' }, body };
  const res = { code: 200, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; } };
  await route.stack.at(-1).handle(req, res); return res;
}
test.beforeEach(() => {
  push = null; filter = null; saved = true; expireCandidates = [];
  reservation = { _id: 'booking', userId: 'client', providerUserId: 'provider', providerProfileId: 'profile', status: 'oczekująca', date: '2027-01-01', dateOnly: true, clientSeen: true, providerSeen: false, updatedAt: new Date('2026-10-21T10:00:00Z'), save: async () => {} };
});
test('acceptance reopens unread state for client and pushes to that client', async () => {
  assert.equal((await call('patch', '/:id/status', 'provider', { status: 'zaakceptowana' })).code, 200);
  assert.equal(reservation.clientSeen, false);
  assert.equal(reservation.clientUpdateType, 'accepted');
  assert.equal(reservation.providerSeen, true);
  assert.equal(push.uid, 'client'); assert.equal(push.category, 'reservationUpdates');
});
test('recipient count includes closed changes and both sides without summing duplicate counts', async () => {
  const response = await call('get', '/unread-count', 'client');
  assert.equal(response.body.count, 2);
  assert.deepEqual(filter, unreadReservationQuery('client'));
  assert.equal(filter.$or[0].clientSeen, false);
  assert.equal(filter.$or[1].providerSeen, false);
});
test('reading is owner-only and uses the version actually displayed to protect newer changes', async () => {
  assert.equal((await call('patch', '/:id/seen', 'stranger', { who: 'client' })).code, 403);
  assert.equal((await call('patch', '/:id/seen', 'client', { who: 'other' })).code, 400);
  saved = false;
  assert.equal((await call('patch', '/:id/seen', 'client', { who: 'client', viewedUpdatedAt: '2026-10-21T10:00:00Z' })).code, 409);
  assert.equal(filter.updatedAt.toISOString(), '2026-10-21T10:00:00.000Z');
  assert.deepEqual(update, { $set: { clientSeen: true } });
});
test('provider cancellation notifies client and cannot be used by others', async () => {
  reservation.status = 'zaakceptowana';
  assert.equal((await call('patch', '/:id/cancel-by-provider', 'client', { reason: 'Zmiana terminu' })).code, 403);
  assert.equal((await call('patch', '/:id/cancel-by-provider', 'provider', { reason: 'Zmiana terminu' })).code, 200);
  assert.equal(reservation.clientSeen, false); assert.equal(reservation.closedBy, 'provider'); assert.equal(push.uid, 'client');
});
test('notes notify the other participant and closed reservations cannot be reopened', async () => {
  assert.equal((await call('patch', '/:id/provider-note', 'provider', { message: 'Proszę przyjść 5 minut wcześniej.' })).code, 200);
  assert.equal(reservation.clientUpdateType, 'note'); assert.equal(push.uid, 'client');
  assert.equal((await call('patch', '/:id/client-note', 'client', { message: 'Mogę się chwilę spóźnić.' })).code, 200);
  assert.equal(reservation.providerUpdateType, 'note'); assert.equal(push.uid, 'provider');
  reservation.status = 'anulowana';
  assert.equal((await call('patch', '/:id/status', 'provider', { status: 'zaakceptowana' })).code, 409);
});
test('preferences default on for legacy accounts and reject unknown keys and non-boolean values', () => {
  assert.equal(normalizePreferences({ reservationUpdates: false }).reservationUpdates, false);
  assert.equal(normalizePreferences().messages, true);
  assert.equal(validatePreferences({ messages: false }), true);
  assert.equal(validatePreferences({ messages: 'false' }), false);
  assert.equal(validatePreferences({ role: 'admin' }), false);
});
test('new update marks a read reservation unread without changing the other side', () => {
  markReservationUpdate(reservation, 'client', 'accepted');
  assert.equal(reservation.clientSeen, false); assert.equal(reservation.providerSeen, false);
});

test('expiry marks both recipients unread and concurrent expiry processing cannot send a duplicate', async () => {
  expireCandidates = [{ _id: 'booking' }];
  await call('get', '/unread-count', 'client');
  assert.equal(update.$set.clientUpdateType, 'expired');
  assert.equal(update.$set.providerUpdateType, 'expired');
  assert.equal(update.$set.clientSeen, false);
  assert.equal(update.$set.providerSeen, false);
  assert.equal(push.category, 'reservationUpdates');
  push = null; saved = false;
  await call('get', '/unread-count', 'client');
  assert.equal(push, null);
});
