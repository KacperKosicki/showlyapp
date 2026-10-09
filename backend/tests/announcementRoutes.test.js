const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const mongoose = require('mongoose');
const objectId = () => new mongoose.Types.ObjectId().toString();
const announcementId = objectId(), applicationId = objectId();
const query = value => ({ lean: async () => value, select() { return this; }, populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
let item, app, profile, visible, created, savedApplication, conversationInsert, conversationAppend, previousConversation, deletedConversations, disappearDuringCreation, announcementReads;
const Announcement = {
  collection: { name: 'announcements' },
  findOne: filter => {
    announcementReads++;
    return query(item && !(disappearDuringCreation && announcementReads > 1) && (!filter.ownerUid || filter.ownerUid === item.ownerUid) && !(filter.deletedAt === null && item.deletedAt) ? item : null);
  },
  findById: () => query(item), countDocuments: async () => 0,
  create: async value => { created = value; return { ...value, toObject: () => value }; },
};
const Application = { find: () => query(app ? [app] : []), init: async () => {}, findOne: () => query(app), countDocuments: async () => 0, findOneAndUpdate: async (filter, update) => {
  savedApplication = { _id: applicationId, ...filter, ...update.$set }; return savedApplication;
} };
const Publication = { deleteOne: async () => { visible = false; }, exists: async () => visible, findOne: () => query(visible ? { announcementId, expiresAt: new Date(Date.now() + 86400000) } : null) };
const stubs = {
  '../models/Announcement': Announcement, '../models/AnnouncementPublication': Publication,
  '../models/AnnouncementApplication': Application, '../models/Profile': { findOne: () => query(profile) },
  '../models/User': { collection: { name: 'users' }, findOne: () => query({ displayName: 'Autor', email: 'private@example.com', avatar: 'https://example.com/avatar.jpg' }) },
  '../models/Conversation': {
    deleteMany: async filter => { deletedConversations = filter; },
    deleteOne: async filter => { deletedConversations = filter; },
    findOneAndUpdate: async (filter, update) => { conversationInsert = { filter, update }; return previousConversation; },
    updateOne: async (filter, update) => { conversationAppend = { filter, update }; },
  }, '../utils/sendPushNotification': { sendPushToUserUid: async () => {} },
  '../middleware/requireAuth': (req, res, next) => { req.auth = { uid: req.testUid }; return next(); },
};
const originalLoad = Module._load;
let router;
try {
  Module._load = function(request, parent, ...rest) {
    if (parent?.filename.endsWith('routes\\announcements.js') || parent?.filename.endsWith('routes/announcements.js')) {
      if (stubs[request]) return stubs[request];
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  router = require('../routes/announcements');
} finally { Module._load = originalLoad; }
async function call(method, route, uid, body = {}) {
  const layer = router.stack.find(layer => layer.route?.path === route && layer.route.methods[method]);
  const req = { query: {}, params: { id: announcementId, applicationId }, body, headers: uid ? { authorization: 'Bearer test' } : {}, testUid: uid };
  const res = { code: 200, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } };
  const invoke = async index => { if (layer.route.stack[index]) await layer.route.stack[index].handle(req, res, () => invoke(index + 1)); };
  await invoke(0); return res;
}
test.beforeEach(() => {
  deletedConversations = null;
  disappearDuringCreation = false; announcementReads = 0;
  visible = true; profile = null; created = null; app = null;
  savedApplication = null; conversationInsert = null; conversationAppend = null; previousConversation = null;
  item = { _id: announcementId, ownerUid: 'owner', state: 'open', title: 'Szukam DJ-a', description: 'Opis ogłoszenia', publishedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) };
});

test('public cards load account avatars after pagination without exposing account or owner data', async () => {
  let pipeline;
  Publication.aggregate = async stages => {
    pipeline = stages;
    return [{ items: [{ _id: announcementId, authorName: 'Autor', authorAvatar: 'https://example.com/avatar.jpg' }], count: [{ total: 1 }] }];
  };
  const result = await call('get', '/', null);
  assert.equal(result.code, 200);
  assert.equal(result.body.items[0].authorAvatar, 'https://example.com/avatar.jpg');
  const stages = pipeline.at(-1).$facet.items;
  assert.ok(stages.findIndex(stage => stage.$limit) < stages.findIndex(stage => stage.$lookup));
  assert.equal(stages.find(stage => stage.$lookup).$lookup.from, 'users');
  assert.deepEqual(stages.find(stage => stage.$lookup).$lookup.pipeline[1].$project, { _id: 0, avatar: 1 });
  const projection = stages.at(-1).$project;
  assert.equal(projection.authorAvatar, 1);
  assert.equal(projection.ownerUid, undefined);
  assert.equal(projection.authorAccount, undefined);
  assert.equal(projection.email, undefined);
});

test('public announcement details include the author avatar without exposing private account data', async () => {
  const result = await call('get', '/:id', null);
  assert.equal(result.code, 200);
  assert.equal(result.body.authorAvatar, 'https://example.com/avatar.jpg');
  assert.equal(result.body.ownerUid, undefined);
  assert.equal(result.body.email, undefined);
});

test('deleting a listing removes only its application threads and cannot recreate them through an old link', async () => {
  app = { _id: applicationId, applicantUid: 'provider' };
  item.save = async () => {};
  const result = await call('delete', '/:id', 'owner');
  assert.equal(result.code, 200);
  assert.ok(item.deletedAt);
  assert.deepEqual(deletedConversations, { _id: { $in: [applicationId] }, channel: 'profile_to_account' });
  assert.equal(visible, false);
  assert.equal((await call('post', '/:id/applications/:applicationId/conversation', 'provider')).code, 410);
  assert.equal(conversationInsert, null);
  assert.equal((await call('delete', '/:id', 'owner')).code, 200);
});

test('concurrent listing deletion cleans up a thread created through an in-flight old link', async () => {
  app = { _id: applicationId, applicantUid: 'provider', message: 'Propozycja współpracy', proposedBudget: null };
  disappearDuringCreation = true;
  const result = await call('post', '/:id/applications/:applicationId/conversation', 'provider');
  assert.equal(result.code, 410);
  assert.ok(conversationInsert);
  assert.deepEqual(deletedConversations, { _id: applicationId, channel: 'profile_to_account' });
});
test('only owner can edit, delete, pause or inspect received applications', async () => {
  for (const [method, path] of [['patch', '/:id'], ['delete', '/:id'], ['post', '/:id/pause'], ['get', '/:id/applications']]) {
    assert.equal((await call(method, path, 'stranger')).code, 404);
  }
});
test('a regular account cannot apply; a provider cannot apply to itself or an expired listing', async () => {
  assert.equal((await call('post', '/:id/applications', 'provider')).code, 403);
  profile = { _id: objectId(), name: 'DJ' };
  assert.equal((await call('post', '/:id/applications', 'owner')).code, 403);
  visible = false;
  assert.equal((await call('post', '/:id/applications', 'provider')).code, 409);
});
test('an existing application cannot be duplicated', async () => {
  profile = { _id: objectId() }; app = { status: 'pending' };
  const result = await call('post', '/:id/applications', 'provider', { message: 'Mam doświadczenie i mogę pomóc w organizacji.' });
  assert.equal(result.code, 409);
});
test('only author may shortlist; only applicant may withdraw; unrelated accounts have no conversation access', async () => {
  app = { _id: applicationId, applicantUid: 'provider', status: 'pending' };
  assert.equal((await call('patch', '/:id/applications/:applicationId', 'stranger', { status: 'shortlisted' })).code, 403);
  assert.equal((await call('patch', '/:id/applications/:applicationId', 'provider', { status: 'shortlisted' })).code, 403);
  assert.equal((await call('patch', '/:id/applications/:applicationId', 'owner', { status: 'withdrawn' })).code, 403);
  assert.equal((await call('post', '/:id/applications/:applicationId/conversation', 'stranger')).code, 403);
});
test('ownership is taken from verified session, never from submitted JSON', async () => {
  const result = await call('post', '/', 'owner', { ownerUid: 'attacker', authorName: 'Fake', title: 'Szukam DJ-a na wesele', description: 'Szukam osoby z nagłośnieniem i doświadczeniem w prowadzeniu wesel.', category: 'music', workMode: 'remote', scope: 'once', dateMode: 'flexible', budgetMode: 'negotiable' });
  assert.equal(result.code, 201); assert.equal(created.ownerUid, 'owner'); assert.equal(created.authorName, 'Autor');
  assert.equal(result.body.ownerUid, undefined); assert.equal(result.body.email, undefined);
});
test('hidden listings are private, even when a caller knows the ID', async () => {
  visible = false; item.expiresAt = new Date(0);
  assert.equal((await call('get', '/:id', 'stranger')).code, 404);
  const result = await call('get', '/:id', 'owner');
  assert.equal(result.code, 200); assert.equal(result.body.isOwner, true); assert.equal(result.body.ownerUid, undefined);
});

test('a provider application creates a private conversation containing the proposal and quote', async () => {
  profile = { _id: objectId(), name: 'DJ Studio' };
  const message = 'Mam doświadczenie i własny sprzęt. Chętnie poprowadzę wydarzenie.';
  const result = await call('post', '/:id/applications', 'provider', { message, proposedBudget: 3200 });
  assert.equal(result.code, 201);
  assert.equal(savedApplication.applicantUid, 'provider');
  assert.equal(savedApplication.profileId, profile._id);
  assert.equal(savedApplication.status, 'pending');
  assert.equal(result.body.conversationId, applicationId);
  const conversation = conversationInsert.update.$setOnInsert;
  assert.equal(conversation.channel, 'profile_to_account');
  assert.deepEqual(conversation.participants, [{ uid: 'provider' }, { uid: 'owner' }]);
  assert.equal(conversation.messages[0].toUid, 'owner');
  assert.ok(conversation.messages[0].content.includes(message));
  assert.ok(conversation.messages[0].content.includes('3200 zł'));
  assert.equal(conversationAppend, null);
});

test('renewing a withdrawn application updates the proposal while preserving the existing conversation', async () => {
  profile = { _id: objectId(), name: 'DJ Studio' };
  app = { _id: applicationId, status: 'withdrawn' }; previousConversation = { _id: applicationId };
  const message = 'Termin nadal mi pasuje. Przesyłam zaktualizowaną propozycję współpracy.';
  const result = await call('post', '/:id/applications', 'provider', { message });
  assert.equal(result.code, 201);
  assert.equal(result.body.conversationId, applicationId);
  assert.equal(savedApplication.status, 'pending');
  assert.equal(conversationAppend.filter._id, applicationId);
  assert.ok(conversationAppend.update.$push.messages.content.includes(message));
  assert.equal(conversationAppend.update.$push.messages.read, false);
});
