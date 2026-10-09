const express = require('express');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Publication = require('../models/AnnouncementPublication');
const Application = require('../models/AnnouncementApplication');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const requireAuth = require('../middleware/requireAuth');
const { sendPushToUserUid } = require('../utils/sendPushNotification');
const { CATEGORIES, error, text, money, date, validateAnnouncement, checkPublishDate, statusOf, claimPublication } = require('../utils/announcements');

const router = express.Router();
const wrap = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (err) {
    if (!err.status && err.code !== 11000) console.error('Announcements:', err);
    res.status(err.status || (err.code === 11000 ? 409 : 500)).json({ message: err.status ? err.message : err.code === 11000 ? 'To zgłoszenie już istnieje.' : 'Nie udało się wykonać operacji. Spróbuj ponownie.', ...(err.code === 'ACTIVE_LIMIT' ? { code: err.code } : {}) });
  }
};
function id(value) {
  if (!mongoose.isObjectIdOrHexString(value)) throw error('Nieprawidłowy identyfikator.', 400);
  return value;
}
async function owned(req) {
  const item = await Announcement.findOne({ _id: id(req.params.id), ownerUid: req.auth.uid, deletedAt: null });
  if (!item) throw error('Nie znaleziono Twojego ogłoszenia.', 404);
  return item;
}
const publicFields = { _id: 1, title: 1, description: 1, authorName: 1, authorAvatar: 1, category: 1, workMode: 1, location: 1, scope: 1, dateMode: 1, dateFrom: 1, dateTo: 1, budgetMode: 1, budgetMin: 1, budgetMax: 1, publishedAt: 1, expiresAt: 1 };
const serialize = (item) => Object.fromEntries(Object.keys(publicFields).map(key => [key, item[key]]));
const optionalAuth = (req, res, next) => req.headers.authorization ? requireAuth(req, res, next) : next();
async function notify(uid, title, body) {
  try { await sendPushToUserUid(uid, { title, body, url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/twoje-ogloszenia` }); } catch (err) { console.error('Announcement notification:', err.message); }
}
async function conversationFor(application, announcement, renewed = false) {
  const exists = await Announcement.findOne({ _id: announcement._id, deletedAt: null }).lean();
  if (!exists || announcement.deletedAt) throw error('Ogłoszenie zostało usunięte wraz z rozmową.', 410);
  // Reuse the application ID as a dedicated conversation ID: concurrent retries
  // cannot create duplicate threads and unrelated enquiries remain separate.
  const content = `Zgłoszenie do ogłoszenia „${announcement.title}”\n\n${application.message}${application.proposedBudget !== null ? `\n\nProponowana kwota: ${application.proposedBudget} zł` : ''}`;
  const previous = await Conversation.findOneAndUpdate({ _id: application._id }, { $setOnInsert: {
    channel: 'profile_to_account', pairKey: [application.applicantUid, announcement.ownerUid].sort().join('|'),
    participants: [{ uid: application.applicantUid }, { uid: announcement.ownerUid }],
    firstFromUid: application.applicantUid, isClosed: false,
    messages: [{ fromUid: application.applicantUid, toUid: announcement.ownerUid, content }],
  } }, { upsert: true, runValidators: true });
  if (renewed && previous) await Conversation.updateOne({ _id: application._id }, {
    $push: { messages: { fromUid: application.applicantUid, toUid: announcement.ownerUid, content: `Ponowne ${content.replace(/^Zgłoszenie/, 'zgłoszenie')}`, createdAt: new Date(), read: false } },
    $set: { updatedAt: new Date() },
  });
  // Close the race with deletion while a proposal or an old link is being opened.
  if (!await Announcement.findOne({ _id: announcement._id, deletedAt: null }).lean()) {
    await Conversation.deleteOne({ _id: application._id, channel: 'profile_to_account' });
    throw error('Ogłoszenie zostało usunięte wraz z rozmową.', 410);
  }
  return application._id;
}

router.get('/', wrap(async (req, res) => {
  const page = Math.min(1000, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const match = { 'item.deletedAt': null, 'item.state': 'open' };
  const escaped = (value) => String(value).slice(0, 100).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (req.query.q) {
    const regex = { $regex: escaped(req.query.q), $options: 'i' };
    match.$or = [{ 'item.title': regex }, { 'item.description': regex }, { 'item.location': regex }];
  }
  if (req.query.location) match['item.location'] = { $regex: escaped(req.query.location), $options: 'i' };
  if (req.query.category) {
    if (!CATEGORIES.includes(req.query.category)) throw error('Nieprawidłowa kategoria.');
    match['item.category'] = req.query.category;
  }
  if (req.query.workMode) {
    if (!['onsite', 'remote', 'hybrid'].includes(req.query.workMode)) throw error('Nieprawidłowe miejsce współpracy.');
    match['item.workMode'] = req.query.workMode;
  }
  const and = [];
  if (req.query.budgetMin !== undefined) and.push({ $or: [{ 'item.budgetMode': 'negotiable' }, { 'item.budgetMax': { $gte: money(req.query.budgetMin) } }] });
  if (req.query.budgetMax !== undefined) and.push({ $or: [{ 'item.budgetMode': 'negotiable' }, { 'item.budgetMin': { $lte: money(req.query.budgetMax) } }] });
  if (req.query.dateFrom) {
    const from = date(req.query.dateFrom);
    and.push({ $or: [{ 'item.dateMode': 'flexible' }, { 'item.dateFrom': { $gte: from } }, { 'item.dateTo': { $gte: from } }] });
  }
  if (and.length) match.$and = and;
  const result = await Publication.aggregate([
    { $match: { expiresAt: { $gt: new Date() } } },
    { $lookup: { from: Announcement.collection.name, localField: 'announcementId', foreignField: '_id', as: 'item' } },
    { $unwind: '$item' }, { $match: match },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$item', { publishedAt: '$publishedAt', expiresAt: '$expiresAt' }] } } },
    { $sort: { publishedAt: -1, _id: -1 } },
    { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit },
      { $lookup: { from: User.collection.name, let: { uid: '$ownerUid' }, pipeline: [
        { $match: { $expr: { $eq: ['$firebaseUid', '$$uid'] } } }, { $project: { _id: 0, avatar: 1 } }, { $limit: 1 },
      ], as: 'authorAccount' } },
      { $set: { authorAvatar: { $ifNull: [{ $arrayElemAt: ['$authorAccount.avatar', 0] }, ''] } } },
      { $project: publicFields }], count: [{ $count: 'total' }] } },
  ]);
  res.json({ items: result[0]?.items || [], total: result[0]?.count[0]?.total || 0, page, limit });
}));

router.get('/mine', requireAuth, wrap(async (req, res) => {
  const [items, publication, applications, profile] = await Promise.all([
    Announcement.find({ ownerUid: req.auth.uid, deletedAt: null }).sort({ createdAt: -1 }).lean(),
    Publication.findOne({ ownerUid: req.auth.uid }).lean(),
    Application.find({ applicantUid: req.auth.uid }).sort({ createdAt: -1 }).populate({ path: 'announcementId', select: Object.keys(publicFields).join(' ') + ' deletedAt state' }).lean(),
    Profile.findOne({ userId: req.auth.uid }).select('name slug').lean(),
  ]);
  const counts = await Application.aggregate([{ $match: { announcementId: { $in: items.map(item => item._id) }, status: { $ne: 'withdrawn' } } }, { $group: { _id: '$announcementId', count: { $sum: 1 } } }]);
  res.json({ items: items.map(item => ({ ...serialize(item), state: statusOf(item, publication), applicationCount: counts.find(count => String(count._id) === String(item._id))?.count || 0 })), applications: applications.map(app => ({ ...app, announcementId: app.announcementId?.deletedAt ? null : app.announcementId, conversationId: app._id })), profile, activeId: publication && publication.expiresAt > new Date() ? publication.announcementId : null });
}));

router.post('/', requireAuth, wrap(async (req, res) => {
  const data = validateAnnouncement(req.body || {});
  if (await Announcement.countDocuments({ ownerUid: req.auth.uid, deletedAt: null }) >= 50) throw error('Masz 50 zapisanych ogłoszeń. Usuń niepotrzebne, aby dodać kolejne.', 409);
  const user = await User.findOne({ firebaseUid: req.auth.uid }).select('displayName name').lean();
  const item = await Announcement.create({ ...data, ownerUid: req.auth.uid, authorName: String(user?.displayName || user?.name || 'Użytkownik Showly').slice(0, 80) });
  res.status(201).json({ ...serialize(item.toObject()), state: 'draft' });
}));

router.patch('/:id', requireAuth, wrap(async (req, res) => {
  const item = await owned(req);
  const data = validateAnnouncement(req.body || {});
  const publication = await Publication.findOne({ ownerUid: req.auth.uid, announcementId: item._id, expiresAt: { $gt: new Date() } }).lean();
  if (publication) checkPublishDate(data);
  Object.assign(item, data);
  await item.save();
  res.json({ ok: true });
}));

router.post('/:id/publish', requireAuth, wrap(async (req, res) => {
  const item = await owned(req);
  checkPublishDate(item);
  await Publication.init();
  const publication = await claimPublication(Publication, req.auth.uid, item._id, req.body?.replace === true);
  await Announcement.updateOne({ _id: item._id, deletedAt: null }, { $set: { state: 'open', publishedAt: publication.publishedAt, expiresAt: publication.expiresAt } });
  res.json({ ok: true, expiresAt: publication.expiresAt });
}));

router.post('/:id/pause', requireAuth, wrap(async (req, res) => {
  const item = await owned(req);
  await Publication.deleteOne({ ownerUid: req.auth.uid, announcementId: item._id });
  res.json({ ok: true });
}));
router.post('/:id/close', requireAuth, wrap(async (req, res) => {
  const item = await owned(req);
  item.state = 'closed'; await item.save();
  await Publication.deleteOne({ ownerUid: req.auth.uid, announcementId: item._id });
  res.json({ ok: true });
}));
router.delete('/:id', requireAuth, wrap(async (req, res) => {
  // Retrying after a partial cleanup must remain possible for the author.
  const item = await Announcement.findOne({ _id: id(req.params.id), ownerUid: req.auth.uid });
  if (!item) throw error('Nie znaleziono Twojego ogłoszenia.', 404);
  if (!item.deletedAt) { item.deletedAt = new Date(); await item.save(); }
  const applications = await Application.find({ announcementId: item._id }).select('_id').lean();
  await Conversation.deleteMany({ _id: { $in: applications.map(app => app._id) }, channel: 'profile_to_account' });
  await Publication.deleteOne({ ownerUid: req.auth.uid, announcementId: item._id });
  res.json({ ok: true });
}));

router.get('/:id/applications', requireAuth, wrap(async (req, res) => {
  const item = await owned(req);
  const items = await Application.find({ announcementId: item._id }).sort({ createdAt: -1 }).populate({ path: 'profileId', select: 'name slug role avatar banner location tags rating reviews theme.primary' }).lean();
  res.json({ items: items.map(app => ({ ...app, conversationId: app._id })) });
}));
router.post('/:id/applications', requireAuth, wrap(async (req, res) => {
  const item = await Announcement.findOne({ _id: id(req.params.id), deletedAt: null, state: 'open' }).lean();
  if (!item || !await Publication.exists({ announcementId: item._id, expiresAt: { $gt: new Date() } })) throw error('To ogłoszenie nie jest już aktywne.', 409);
  if (item.ownerUid === req.auth.uid) throw error('Nie możesz zgłosić się do własnego ogłoszenia.', 403);
  const profile = await Profile.findOne({ userId: req.auth.uid }).select('_id name').lean();
  if (!profile) throw error('Aby się zgłosić, utwórz profil usługodawcy.', 403);
  const message = text(req.body?.message, 20, 2000, 'wiadomość');
  const proposedBudget = money(req.body?.proposedBudget);
  await Application.init();
  const existing = await Application.findOne({ announcementId: item._id, applicantUid: req.auth.uid });
  if (existing && existing.status !== 'withdrawn') throw error('Zgłoszenie zostało już wysłane.', 409);
  const application = await Application.findOneAndUpdate({ announcementId: item._id, applicantUid: req.auth.uid, status: 'withdrawn' }, { $set: { profileId: profile._id, message, proposedBudget, status: 'pending' } }, { upsert: true, new: true, runValidators: true });
  const conversationId = await conversationFor(application, item, Boolean(existing));
  await notify(item.ownerUid, 'Nowe zgłoszenie do ogłoszenia', `${profile.name || 'Usługodawca'} odpowiada na „${item.title}”.`);
  res.status(201).json({ application, conversationId });
}));
router.patch('/:id/applications/:applicationId', requireAuth, wrap(async (req, res) => {
  const item = await Announcement.findOne({ _id: id(req.params.id), deletedAt: null }).lean();
  const app = await Application.findOne({ _id: id(req.params.applicationId), announcementId: req.params.id });
  if (!item || !app) throw error('Nie znaleziono zgłoszenia.', 404);
  const owner = item.ownerUid === req.auth.uid;
  const applicant = app.applicantUid === req.auth.uid;
  const status = req.body?.status;
  if (!(owner && ['shortlisted', 'declined', 'pending'].includes(status)) && !(applicant && status === 'withdrawn')) throw error('Brak dostępu do tej operacji.', 403);
  if (owner && app.status === 'withdrawn') throw error('To zgłoszenie zostało wycofane.', 409);
  const updated = await Application.findOneAndUpdate({ _id: app._id, status: app.status }, { $set: { status } }, { new: true, runValidators: true });
  if (!updated) throw error('Zgłoszenie zmieniło się. Odśwież widok.', 409);
  if (owner) await notify(app.applicantUid, 'Status Twojego zgłoszenia', `Zmiana statusu zgłoszenia do „${item.title}”.`);
  res.json({ ok: true });
}));
router.post('/:id/applications/:applicationId/conversation', requireAuth, wrap(async (req, res) => {
  const app = await Application.findOne({ _id: id(req.params.applicationId), announcementId: id(req.params.id) }).lean();
  const item = await Announcement.findById(req.params.id).lean();
  if (!item || !app || ![item.ownerUid, app.applicantUid].includes(req.auth.uid)) throw error('Brak dostępu do rozmowy.', 403);
  if (item.deletedAt) throw error('Ogłoszenie zostało usunięte wraz z rozmową.', 410);
  res.json({ id: await conversationFor(app, item) });
}));

router.get('/:id', optionalAuth, wrap(async (req, res) => {
  const item = await Announcement.findOne({ _id: id(req.params.id), deletedAt: null }).lean();
  if (!item) throw error('Nie znaleziono ogłoszenia.', 404);
  const publication = await Publication.findOne({ announcementId: item._id }).lean();
  const state = statusOf(item, publication);
  const isOwner = req.auth?.uid === item.ownerUid;
  if (state !== 'active' && !isOwner) throw error('Ogłoszenie jest ukryte lub wygasło.', 404);
  const author = await User.findOne({ firebaseUid: item.ownerUid }).select('avatar -_id').lean();
  item.authorAvatar = author?.avatar || '';
  const profile = req.auth ? await Profile.findOne({ userId: req.auth.uid }).select('name slug').lean() : null;
  const ownApplication = req.auth ? await Application.findOne({ announcementId: item._id, applicantUid: req.auth.uid }).lean() : null;
  res.json({ ...serialize(item), ...(publication ? { publishedAt: publication.publishedAt, expiresAt: publication.expiresAt } : {}), state, isOwner, profile, canApply: Boolean(profile && !isOwner && state === 'active'), ownApplication, applicationCount: await Application.countDocuments({ announcementId: item._id, status: { $ne: 'withdrawn' } }) });
}));
module.exports = router;
