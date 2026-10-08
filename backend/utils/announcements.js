const CATEGORIES = ['music', 'photo', 'beauty', 'flowers', 'development', 'design', 'education', 'local', 'other'];
const DAYS = 30;
const error = (message, status = 400, code) => Object.assign(new Error(message), { status, code });
const text = (value, min, max, label) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw error(`Uzupełnij poprawnie pole: ${label} (${min}–${max} znaków).`);
  return value.trim();
};
const choice = (value, allowed, label) => {
  if (!allowed.includes(value)) throw error(`Nieprawidłowa wartość: ${label}.`);
  return value;
};
function money(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (!['number', 'string'].includes(typeof value)) throw error('Nieprawidłowy budżet.');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10000000) throw error('Budżet musi mieścić się w zakresie 0–10 000 000 zł.');
  return Math.round(number * 100) / 100;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw error('Podaj poprawną datę.');
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw error('Podaj poprawną datę.');
  return value;
}
function validateAnnouncement(body) {
  const result = {
    title: text(body.title, 5, 100, 'tytuł'), description: text(body.description, 30, 4000, 'opis'),
    category: choice(body.category, CATEGORIES, 'kategoria'),
    workMode: choice(body.workMode, ['onsite', 'remote', 'hybrid'], 'miejsce współpracy'),
    scope: choice(body.scope, ['once', 'project', 'recurring'], 'rodzaj współpracy'),
    dateMode: choice(body.dateMode, ['flexible', 'exact', 'range'], 'termin'),
    budgetMode: choice(body.budgetMode, ['negotiable', 'fixed', 'range'], 'budżet'),
    location: '', dateFrom: '', dateTo: '', budgetMin: null, budgetMax: null,
  };
  result.location = text(body.location || '', result.workMode === 'remote' ? 0 : 2, 100, 'miejscowość');
  if (result.dateMode !== 'flexible') result.dateFrom = date(body.dateFrom);
  if (result.dateMode === 'range') {
    result.dateTo = date(body.dateTo);
    if (result.dateTo < result.dateFrom) throw error('Koniec terminu nie może wypadać przed początkiem.');
  }
  if (result.budgetMode !== 'negotiable') {
    result.budgetMin = money(body.budgetMin);
    if (result.budgetMin === null) throw error('Uzupełnij kwotę budżetu.');
    result.budgetMax = result.budgetMode === 'fixed' ? result.budgetMin : money(body.budgetMax);
    if (result.budgetMax === null || result.budgetMax < result.budgetMin) throw error('Górny budżet musi być nie mniejszy od dolnego.');
  }
  return result;
}
function checkPublishDate(announcement, now = new Date()) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(now);
  if (announcement.dateMode !== 'flexible' && (announcement.dateTo || announcement.dateFrom) < today) throw error('Termin już minął. Zaktualizuj go przed publikacją.');
}
function statusOf(announcement, publication, now = new Date()) {
  if (announcement.state === 'closed') return 'closed';
  if (publication && String(publication.announcementId) === String(announcement._id) && new Date(publication.expiresAt) > now) return 'active';
  if (!announcement.publishedAt) return 'draft';
  return new Date(announcement.expiresAt) <= now ? 'expired' : 'paused';
}
async function claimPublication(Publication, ownerUid, announcementId, replace = false, now = new Date()) {
  const expiresAt = new Date(now.getTime() + DAYS * 86400000);
  const filter = { ownerUid, ...(replace ? {} : { expiresAt: { $lte: now } }) };
  try {
    // A live slot doesn't match the filter: upsert hits the unique owner index.
    return await Publication.findOneAndUpdate(filter, { $set: { ownerUid, announcementId, publishedAt: now, expiresAt } }, { new: true, upsert: true, runValidators: true });
  } catch (err) {
    if (err.code === 11000) throw error('Masz już aktywne ogłoszenie. Wybierz zastąpienie poprzedniego lub je ukryj.', 409, 'ACTIVE_LIMIT');
    throw err;
  }
}
module.exports = { CATEGORIES, DAYS, error, text, money, date, validateAnnouncement, checkPublishDate, statusOf, claimPublication };
