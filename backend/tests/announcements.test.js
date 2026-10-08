const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { validateAnnouncement, checkPublishDate, statusOf, claimPublication } = require('../utils/announcements');
const input = { title: 'Szukam DJ-a na wesele', description: 'Szukam osoby, która poprowadzi wesele i pomoże przygotować repertuar.', category: 'music', scope: 'once', workMode: 'onsite', location: 'Poznań', dateMode: 'exact', dateFrom: '2027-06-20', budgetMode: 'range', budgetMin: '2000', budgetMax: '4000' };
test('validates event, remote project and flexible recurring cooperation; ignores ownership injection', () => {
  const data = validateAnnouncement({ ...input, ownerUid: 'attacker', state: 'open' });
  assert.equal(data.budgetMin, 2000); assert.equal(data.ownerUid, undefined); assert.equal(data.state, undefined);
  const remote = validateAnnouncement({ ...input, workMode: 'remote', location: '', dateMode: 'flexible', scope: 'recurring', budgetMode: 'negotiable', dateFrom: 'bad', budgetMin: -1 });
  assert.equal(remote.dateFrom, ''); assert.equal(remote.budgetMin, null);
});
test('rejects invalid dates, budget range, filter operators and missing locality', () => {
  for (const overrides of [{ dateFrom: '2027-02-30' }, { budgetMin: 5000 }, { location: '' }, { category: { $ne: null } }, { budgetMax: Infinity }, { title: ['bad'] }, { dateMode: 'range', dateTo: '2026-01-01' }]) {
    assert.throws(() => validateAnnouncement({ ...input, ...overrides }));
  }
});
test('publication dates use Poland calendar; hidden and expired items stay in owner archive', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  assert.throws(() => checkPublishDate({ ...input, dateFrom: '2026-10-07' }, now));
  assert.doesNotThrow(() => checkPublishDate({ ...input, dateFrom: '2026-10-08' }, now));
  const item = { _id: 'a', state: 'open', publishedAt: now, expiresAt: new Date('2026-11-07T12:00:00Z') };
  const slot = { announcementId: 'a', expiresAt: item.expiresAt };
  assert.equal(statusOf(item, slot, now), 'active');
  assert.equal(statusOf(item, slot, item.expiresAt), 'expired');
  assert.equal(statusOf(item, { ...slot, announcementId: 'b' }, now), 'paused');
  assert.equal(statusOf({ ...item, state: 'closed' }, slot, now), 'closed');
});
test('atomic account slot rejects second publication, allows explicit replacement and renewal after 30 days', async () => {
  const now = new Date('2026-10-08T12:00:00Z'); let current = null;
  const model = { async findOneAndUpdate(filter, update, options) {
    assert.equal(options.upsert, true);
    if (current && filter.expiresAt && current.expiresAt > filter.expiresAt.$lte) throw Object.assign(new Error('unique owner'), { code: 11000 });
    current = update.$set; return current;
  } };
  const results = await Promise.allSettled([claimPublication(model, 'owner', 'a', false, now), claimPublication(model, 'owner', 'b', false, now)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results[1].reason.status, 409);
  assert.equal(current.announcementId, 'a');
  assert.equal(current.expiresAt - now, 30 * 86400000);
  await claimPublication(model, 'owner', 'b', true, now); assert.equal(current.announcementId, 'b');
  await claimPublication(model, 'owner', 'a', false, current.expiresAt); assert.equal(current.announcementId, 'a');
});
test('database schemas enforce one slot per account and one application per account and announcement', () => {
  const Publication = require('../models/AnnouncementPublication');
  const Application = require('../models/AnnouncementApplication');
  assert.ok(Publication.schema.indexes().some(([keys, options]) => keys.ownerUid === 1 && options.unique));
  assert.ok(Application.schema.indexes().some(([keys, options]) => keys.announcementId === 1 && keys.applicantUid === 1 && options.unique));
  assert.ok(!Publication.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined));
  assert.ok(new Application({ announcementId: new mongoose.Types.ObjectId(), applicantUid: 'u', profileId: new mongoose.Types.ObjectId(), message: 'Krótko' }).validateSync());
});
