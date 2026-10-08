const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
let queriedApplications, queriedConversations, removed, deleted = false, expired = false, disabled = false, missing = false;
const threads = [
  { _id: 'application', channel: 'profile_to_account', firstFromUid: 'provider', participants: [{ uid: 'owner' }, { uid: 'provider' }], messages: [{ toUid: 'owner', fromUid: 'provider', content: 'Oferta', read: false }] },
  { _id: 'enquiry', firstFromUid: 'owner', channel: 'account_to_profile', participants: [{ uid: 'owner' }, { uid: 'provider' }], messages: [] },
];
const stubs = {
  '../models/Conversation': {
    find: filter => { queriedConversations = filter; return query(threads); },
    findById: id => query(threads.find(c => c._id === id)),
    deleteMany: async filter => { removed = filter; }, deleteOne: async filter => { removed = filter; },
  },
  '../models/User': { find: () => query([{ firebaseUid: 'owner' }, ...(!missing ? [{ firebaseUid: 'provider', displayName: 'DJ Studio' }] : [])]) },
  '../models/Profile': { find: () => query([{ userId: 'provider', isVisible: true, visibleUntil: new Date(expired ? 0 : Date.now() + 86400000) }]) },
  '../utils/firebaseAdmin': { auth: () => ({ getUsers: async ids => ({ users: ids.map(({ uid }) => ({ uid, disabled: uid === 'provider' && disabled })) }) }) },
  '../models/AnnouncementApplication': { find: filter => { queriedApplications = filter; return query([{ _id: 'application', announcementId: { _id: 'listing', title: 'Szukam DJ-a', deletedAt: deleted ? new Date() : null } }]); } },
  '../utils/sendPushNotification': { sendPushToUserUid: async () => {} },
  '../middleware/requireAuth': (req, res, next) => { req.auth = { uid: 'owner' }; return next(); },
};
const originalLoad = Module._load;
let router;
try {
  Module._load = function(request, parent, ...rest) {
    if (/[\\/]routes[\\/]conversations\.js$/.test(parent?.filename || '') && stubs[request]) return stubs[request];
    return originalLoad.call(this, request, parent, ...rest);
  };
  router = require('../routes/conversations');
} finally { Module._load = originalLoad; }

async function call(path, method = 'get', params = {}, body = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
  const req = { params, body, query: {} };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const invoke = async index => { if (route.stack[index]) await route.stack[index].handle(req, res, () => invoke(index + 1)); };
  await invoke(0); return res;
}
const list = uid => call('/by-uid/:uid', 'get', { uid });
test.beforeEach(() => { deleted = false; expired = false; disabled = false; missing = false; removed = null; });

test('active announcement threads retain IDs and resolve titles independently from enquiries', async () => {
  const result = await list('owner');
  assert.equal(result.code, 200);
  assert.deepEqual(queriedConversations, { 'participants.uid': 'owner' });
  assert.deepEqual(queriedApplications, { _id: { $in: ['application'] } });
  assert.deepEqual(result.body[0].announcement, { id: 'listing', title: 'Szukam DJ-a', deleted: false });
  assert.equal(result.body[0]._id, 'application');
  assert.equal(result.body[0].unreadCount, 1);
  assert.equal(result.body[1]._id, 'enquiry');
  assert.equal(result.body[1].announcement, undefined);
});

test('legacy threads from deleted listings are removed from the inbox without deleting enquiries', async () => {
  deleted = true;
  const result = await list('owner');
  assert.deepEqual(result.body.map(c => c._id), ['enquiry']);
  assert.deepEqual(removed, { _id: { $in: ['application'] }, channel: 'profile_to_account' });
});

test('deleted listing threads cannot be opened, marked read or replied to by a saved ID', async () => {
  deleted = true;
  for (const [path, method, params, body] of [
    ['/:id', 'get', { id: 'application' }, {}],
    ['/:id/read', 'patch', { id: 'application' }, {}],
    ['/send', 'post', {}, { conversationId: 'application', content: 'Odpowiedź' }],
  ]) {
    const result = await call(path, method, params, body);
    assert.equal(result.code, 410);
    assert.equal(result.body.code, 'announcement_deleted');
  }
});

test('expired profiles keep their conversation IDs and resume after renewal', async () => {
  expired = true;
  const result = await list('owner');
  assert.equal(result.body[1].availability.reason, 'profile_expired');
  assert.equal(result.body[1].availability.canOpen, false);
  assert.equal(removed, null);
  assert.equal((await call('/:id', 'get', { id: 'enquiry' })).code, 409);
  expired = false;
  assert.equal((await list('owner')).body[1].availability.canOpen, true);
  assert.equal((await call('/:id', 'get', { id: 'enquiry' })).code, 200);
});

test('missing or Firebase-disabled accounts block direct access and sending without removing history', async () => {
  for (const reason of ['account_missing', 'account_disabled']) {
    missing = reason === 'account_missing'; disabled = reason === 'account_disabled';
    const result = await list('owner');
    assert.equal(result.body[1].availability.reason, reason);
    assert.equal((await call('/send', 'post', {}, { conversationId: 'enquiry', content: 'Test' })).code, 409);
    assert.equal((await call('/send', 'post', {}, { to: 'provider', channel: 'account_to_profile', content: 'Test' })).code, 409);
    assert.equal(removed, null);
  }
});

test('announcement context cannot be loaded through another account inbox', async () => {
  queriedConversations = null; queriedApplications = null;
  const result = await list('other-owner');
  assert.equal(result.code, 403);
  assert.equal(queriedConversations, null);
  assert.equal(queriedApplications, null);
});
