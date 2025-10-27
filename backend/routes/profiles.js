const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User'); // 👈 potrzebne do pobrania nazwy i avatara oceniającego
const Conversation = require('../models/Conversation');
const Favorite = require('../models/Favorite'); // 👈 model ulubionych
const VisitLock = require('../models/VisitLock'); // 👈 anty-spam dla odwiedzin

// -----------------------------
// Helpers: slug + public URLs
// -----------------------------
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

// 🔧 pełne https URL-e (Render/Vercel za proxy)
function getProto(req) {
  const xf = req.headers['x-forwarded-proto'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.protocol || 'https';
}

function absoluteUrl(req, relative) {
  const proto = getProto(req);
  const host = req.get('host');
  return `${proto}://${host}${relative.startsWith('/') ? '' : '/'}${relative}`;
}

// --- NEW: doprowadza wszystkie warianty "uploads" do /uploads/...
function normalizeUploadPath(p = '') {
  if (!p) return '';
  // "uploads/..."  → "/uploads/..."
  if (p.startsWith('uploads/')) return `/${p}`;
  // "./uploads/..." lub "../uploads/..." → "/uploads/..."
  if (p.startsWith('./uploads/') || p.startsWith('../uploads/')) {
    return '/' + p.replace(/^\.{1,2}\//, '');
  }
  return p;
}

// akceptuj /uploads, http i https; wymuś https na produkcji
function toPublicUrl(req, val = '') {
  if (!val) return '';
  const v = normalizeUploadPath(val);

  if (v.startsWith('/uploads/')) return absoluteUrl(req, v);

  if (/^https?:\/\/.+/i.test(v)) {
    const wantedProto = getProto(req); // 'https' za proxy, 'http' lokalnie
    return v.replace(/^https?:\/\//i, `${wantedProto}://`);
  }

  // zostaw np. data:uri itp.
  return v;
}

// Odwiedziny – identyfikacja oglądającego
function getViewerKey(req) {
  const uid = req.headers.uid && String(req.headers.uid);
  if (uid) return `uid:${uid}`;
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  const ua = (req.get('user-agent') || '').slice(0, 100);
  return `ipua:${ip}:${ua}`;
}

async function canCountVisit(ownerUid, viewerKey) {
  try {
    const res = await VisitLock.updateOne(
      { ownerUid, viewerKey },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return res.upsertedCount === 1 || !!res.upsertedId;
  } catch (e) {
    return false; // np. E11000 → duplikat → nie liczymy
  }
}

// --------------------------------------
// GET /api/profiles – aktywne i ważne
// --------------------------------------
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    await Profile.updateMany(
      { isVisible: true, visibleUntil: { $lt: now } },
      { $set: { isVisible: false } }
    );
    const visible = await Profile.find({
      isVisible: true,
      visibleUntil: { $gte: now }
    });
    res.json(visible);
  } catch (e) {
    res.status(500).json({ message: 'Błąd pobierania profili' });
  }
});

// -------------------------------------------------
// GET /api/profiles/by-user/:uid – profil po userId
// -------------------------------------------------
router.get('/by-user/:uid', async (req, res) => {
  console.log('🔍 Szukam profilu dla userId:', req.params.uid);
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) {
      return res.status(404).json({ message: 'Brak wizytówki dla tego użytkownika.' });
    }
    res.json(profile);
  } catch (err) {
    console.error('❌ Błąd w GET /by-user/:uid:', err);
    res.status(500).json({ message: 'Błąd serwera.' });
  }
});

// -----------------------------------------------------------
// GET /api/profiles/slug/:slug – profil po unikalnym slugu
// + normalizacja avatarów w ratedBy → pełne https URL-e
// -----------------------------------------------------------
router.get('/slug/:slug', async (req, res) => {
  try {
    const profile = await Profile.findOne({ slug: req.params.slug }).lean(); // lean dla prostszego modyfikowania
    if (!profile) return res.status(404).json({ message: 'Nie znaleziono profilu.' });

    const now = new Date();
    if (!profile.isVisible || profile.visibleUntil < now) {
      return res.status(403).json({ message: 'Profil jest obecnie niewidoczny.' });
    }

    const viewerUid = req.headers.uid || null;

    // 🔧 NORMALIZACJA avatarów w opiniach
    const ratedBy = Array.isArray(profile.ratedBy)
      ? profile.ratedBy.map((r) => ({
          ...r,
          userAvatar: toPublicUrl(req, r.userAvatar),
        }))
      : [];

    // (opcjonalnie) możesz też znormalizować główny avatar i zdjęcia
    const avatar = toPublicUrl(req, profile.avatar);
    const photos = Array.isArray(profile.photos) ? profile.photos.map((p) => toPublicUrl(req, p)) : profile.photos;

    // Ulubione: flaga + liczba (licznik z pola lub liczony na żywo)
    let isFavorite = false;
    let favoritesCount = profile.favoritesCount;

    if (viewerUid) {
      const favExists = await Favorite.exists({ ownerUid: viewerUid, profileUserId: profile.userId });
      isFavorite = !!favExists;
      // Jeśli chcesz liczyć licznik na żywo:
      // favoritesCount = await Favorite.countDocuments({ profileUserId: profile.userId });
    }

    return res.json({
      ...profile,
      ratedBy,
      avatar,
      photos,
      isFavorite,
      favoritesCount,
    });
  } catch (err) {
    console.error('❌ Błąd w GET /slug/:slug:', err);
    res.status(500).json({ message: 'Błąd serwera.' });
  }
});

// ------------------------------------------------------
// PATCH /api/profiles/:uid/visit — zlicz odwiedziny
// ------------------------------------------------------
router.patch('/:uid/visit', async (req, res) => {
  try {
    const ownerUid = req.params.uid;
    const viewerUid = req.headers.uid || null;

    const profile = await Profile.findOne({ userId: ownerUid }).select('visits isVisible visibleUntil userId');
    if (!profile) return res.status(404).json({ message: 'Nie znaleziono profilu.' });

    const now = new Date();
    if (!profile.isVisible || (profile.visibleUntil && profile.visibleUntil < now)) {
      return res.status(403).json({ message: 'Profil niewidoczny/nieaktywny.' });
    }

    // nie licz własnych wejść
    if (viewerUid && viewerUid === ownerUid) {
      return res.json({ visits: profile.visits, skipped: true });
    }

    const viewerKey = getViewerKey(req);
    const ok = await canCountVisit(ownerUid, viewerKey);
    if (!ok) {
      return res.json({ visits: profile.visits, throttled: true });
    }

    const updated = await Profile.findOneAndUpdate(
      { userId: ownerUid },
      { $inc: { visits: 1 } },
      { new: true, select: 'visits' }
    );

    return res.json({ visits: updated.visits });
  } catch (e) {
    console.error('❌ Błąd /:uid/visit:', e);
    return res.status(500).json({ message: 'Błąd serwera.' });
  }
});

// ------------------------------------------------------------
// PATCH /api/profiles/slug/:slug/visit — zlicz po slugu
// ------------------------------------------------------------
router.patch('/slug/:slug/visit', async (req, res) => {
  try {
    const { slug } = req.params;
    const viewerUid = req.headers.uid || null;

    const profile = await Profile.findOne({ slug }).select('userId visits isVisible visibleUntil');
    if (!profile) return res.status(404).json({ message: 'Nie znaleziono profilu.' });

    const now = new Date();
    if (!profile.isVisible || (profile.visibleUntil && profile.visibleUntil < now)) {
      return res.status(403).json({ message: 'Profil niewidoczny/nieaktywny.' });
    }

    if (viewerUid && viewerUid === profile.userId) {
      return res.json({ visits: profile.visits, skipped: true });
    }

    const viewerKey = getViewerKey(req);
    const ok = await canCountVisit(profile.userId, viewerKey);
    if (!ok) {
      return res.json({ visits: profile.visits, throttled: true });
    }

    const updated = await Profile.findOneAndUpdate(
      { slug },
      { $inc: { visits: 1 } },
      { new: true, select: 'visits' }
    );

    return res.json({ visits: updated.visits });
  } catch (e) {
    console.error('❌ Błąd /slug/:slug/visit:', e);
    return res.status(500).json({ message: 'Błąd serwera.' });
  }
});

// -----------------------------------------
// POST /api/profiles — tworzenie profilu
// -----------------------------------------
router.post('/', async (req, res) => {
  console.log('📦 Żądanie do /api/profiles:', req.body);

  // bezpieczne Stringi
  const userId = String(req.body.userId || '');
  const name = String(req.body.name || '');
  const role = String(req.body.role || '');
  const location = String(req.body.location || '');

  if (!userId || !name) {
    return res.status(400).json({ message: 'Brakuje userId lub name w danych profilu' });
  }

  try {
    const existing = await Profile.findOne({
      name: name.trim(),
      role: role.trim(),
      location: location.trim()
    });
    if (existing) {
      return res.status(409).json({ message: 'Taka wizytówka już istnieje (imię + rola + lokalizacja).' });
    }

    const existingByUser = await Profile.findOne({ userId });
    if (existingByUser) {
      return res.status(409).json({ message: 'Ten użytkownik już posiada wizytówkę.' });
    }

    // slug unikalny
    const baseSlug = slugify(`${name}-${role}`);
    let uniqueSlug = baseSlug, i = 1;
    while (await Profile.findOne({ slug: uniqueSlug })) uniqueSlug = `${baseSlug}-${i++}`;

    const newProfile = new Profile({
      ...req.body,
      name: name.trim(),
      role: role.trim(),
      location: location.trim(),
      slug: uniqueSlug,
      isVisible: true,
      visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dni
    });

    await newProfile.save();

    // ✅ odpowiedź do frontu
    res.status(201).json({ message: 'Profil utworzony', profile: newProfile });

    // 🔔 fire-and-forget: systemowa wiadomość powitalna
    queueMicrotask(async () => {
      try {
        const fromUid = 'SYSTEM';
        const toUid = userId;
        const pairKey = [fromUid, toUid].sort().join('|');

        const welcomeContent = [
          '🎉 Dziękujemy za utworzenie profilu w Showly!',
          '',
          '✅ Co masz na start:',
          '• Twój profil jest widoczny przez 30 dni (możesz przedłużyć w „Twój profil”).',
          '• Domyślny tryb rezerwacji: „Zapytanie bez blokowania” — możesz zmienić w każdej chwili.',
          '',
          '👉 Uzupełnij podstawowe informacje:',
          '• avatar i krótki opis (max 500 znaków),',
          '• rola / specjalizacja i lokalizacja,',
          '• 1–3 tagi,',
          '• widełki cenowe: „od–do”.',
          '',
          '🧰 Dodaj usługi (z czasem trwania/realizacji):',
          '• każda usługa ma nazwę i czas trwania,',
          '• jednostki: minuty / godziny / dni,',
          '• minimum: 15 min / 1 h / 1 dzień,',
          '• przykłady: „Strzyżenie — 45 min”, „Audyt WWW — 3 h”.',
          '',
          '🧑‍🤝‍🧑 Zespół i pracownicy:',
          '• możesz dodać zespół i przypisać do profilu pracowników;',
          '• każdy pracownik ma przypisane usługi;',
          '• tryby przydzielania: „Wybór przez klienta” lub „Automatyczny przydział”.',
          '',
          '🗓️ Tryb rezerwacji:',
          '• Kalendarz godzinowy / Rezerwacja dnia / Zapytanie bez blokowania.',
          '',
          '⏰ Jeśli korzystasz z kalendarza:',
          '• ustaw godziny i dni pracy; przerwy między usługami 15 min.',
          '',
          '🔗 Linki i media:',
          '• do 3 linków i 5 zdjęć (ok. 3 MB).',
          '',
          '❓ Szybkie odpowiedzi (FAQ):',
          '• maks. 3 wpisy — tytuł do 10 znaków, odpowiedź do 64 znaków.',
          '',
          'ℹ️ Wszystko edytujesz w zakładce „Twój profil”. Powodzenia! 👊'
        ].join('\n');

        let convo = await Conversation.findOne({ channel: 'system', pairKey }).exec();

        if (!convo) {
          convo = await Conversation.create({
            channel: 'system',
            pairKey,
            participants: [{ uid: fromUid }, { uid: toUid }],
            firstFromUid: fromUid,
            messages: [{
              fromUid: fromUid,
              toUid: toUid,
              content: welcomeContent,
              isSystem: true,
              createdAt: new Date()
            }],
            createdAt: new Date(),
            updatedAt: new Date(),
            isClosed: false
          });
          console.log('✅ Utworzono wątek systemowy:', convo._id);
        } else {
          convo.messages.push({
            fromUid: fromUid,
            toUid: toUid,
            content: welcomeContent,
            isSystem: true,
            createdAt: new Date()
          });
          convo.updatedAt = new Date();
          await convo.save();
          console.log('✅ Dopięto systemową wiadomość do wątku:', convo._id);
        }
      } catch (e) {
        console.error('⚠️ Błąd tworzenia/dopinania wątku systemowego:', e);
      }
    });
  } catch (err) {
    console.error('❌ Błąd w POST /api/profiles:', err);
    return res.status(500).json({ message: 'Błąd tworzenia profilu' });
  }
});

// ------------------------------------------------------
// PATCH /api/profiles/extend/:uid – +30 dni widoczności
// ------------------------------------------------------
router.patch('/extend/:uid', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu do przedłużenia.' });
    }

    profile.isVisible = true;
    profile.visibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await profile.save();

    res.json({ message: 'Widoczność przedłużona o 30 dni.', profile });
  } catch (error) {
    console.error('❌ Błąd w PATCH /api/profiles/extend:', error);
    res.status(500).json({ message: 'Błąd podczas przedłużania widoczności', error });
  }
});

// -------------------------------------------------------------
// PATCH /api/profiles/update/:uid – aktualizacja wybranych pól
// -------------------------------------------------------------
const allowedFields = [
  'avatar', 'photos', 'profileType', 'location', 'priceFrom', 'priceTo',
  'role', 'availableDates', 'description', 'tags', 'links', 'quickAnswers',
  'showAvailableDates', 'services', 'bookingMode', 'workingHours', 'workingDays',
  'team'
];

router.patch('/update/:uid', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) return res.status(404).json({ message: 'Nie znaleziono profilu.' });

    // zwykłe pola
    for (const field of allowedFields) {
      if (field !== 'team' && req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    }

    // team – częściowe ustawienia
    if (req.body.team) {
      if (typeof req.body.team.enabled !== 'undefined') {
        profile.set('team.enabled', !!req.body.team.enabled);
      }
      if (req.body.team.assignmentMode) {
        profile.set(
          'team.assignmentMode',
          req.body.team.assignmentMode === 'auto-assign' ? 'auto-assign' : 'user-pick'
        );
      }
    }

    await profile.save();
    res.json({ message: 'Profil zaktualizowany', profile });
  } catch (err) {
    console.error('❌ Błąd aktualizacji profilu:', err);
    res.status(500).json({ message: 'Błąd podczas aktualizacji profilu.' });
  }
});

// -----------------------------------------------------------------
// PATCH /api/profiles/rate/:slug – dodanie oceny + komentarza
// + zwrot lastReview z pełnym https URL avatara
// -----------------------------------------------------------------
router.patch('/rate/:slug', async (req, res) => {
  const { userId, rating, comment } = req.body;
  const numericRating = Number(rating);

  // 🔒 Walidacja
  if (
    !userId ||
    isNaN(numericRating) ||
    numericRating < 1 ||
    numericRating > 5 ||
    !comment ||
    comment.trim().length < 10 ||
    comment.trim().length > 200
  ) {
    return res.status(400).json({
      message: 'Ocena musi być liczbą od 1 do 5, a komentarz musi mieć od 10 do 200 znaków.'
    });
  }

  try {
    const profile = await Profile.findOne({ slug: req.params.slug }).select(
      'userId ratedBy rating reviews'
    );
    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu.' });
    }

    // Właściciel nie ocenia własnej wizytówki
    if (profile.userId === userId) {
      return res.status(403).json({ message: 'Nie możesz ocenić własnej wizytówki.' });
    }

    if (!Array.isArray(profile.ratedBy)) {
      profile.ratedBy = [];
    }

    // Jeden użytkownik → jedna ocena
    if (profile.ratedBy.find((r) => r.userId === userId)) {
      return res.status(400).json({ message: 'Już oceniłeś ten profil.' });
    }

    // 👤 dane autora opinii
    let userName = 'Użytkownik';
    let userAvatar = '';
    try {
      const user = await User.findOne({ firebaseUid: userId }).select('name avatar');
      if (user?.name) userName = user.name;
      if (user?.avatar) userAvatar = user.avatar;
    } catch (e) {
      console.warn('⚠️ Nie udało się pobrać danych użytkownika:', e.message);
    }

    // ✅ zapis opinii
    profile.ratedBy.push({
      userId,
      rating: numericRating,
      comment: comment.trim(),
      userName,
      userAvatar,            // przechowujemy jak w bazie (może być względny)
      createdAt: new Date()
    });

    // 🔢 nowa średnia i liczba opinii
    const total = profile.ratedBy.reduce((sum, r) => sum + r.rating, 0);
    profile.rating = Number((total / profile.ratedBy.length).toFixed(2));
    profile.reviews = profile.ratedBy.length;

    await profile.save();

    // 🧩 świeżo dodana opinia – znormalizuj avatar do pełnego URL-a ZANIM zwrócisz
    const rawLast = profile.ratedBy[profile.ratedBy.length - 1];
    const lastReview = {
      ...(rawLast.toObject?.() || rawLast),
      userAvatar: toPublicUrl(req, rawLast.userAvatar),
    };

    return res.json({
      message: 'Ocena dodana.',
      rating: profile.rating,
      reviews: profile.reviews,
      review: lastReview
    });
  } catch (err) {
    console.error('❌ Błąd oceniania:', err);
    return res.status(500).json({ message: 'Błąd serwera.', error: err.message });
  }
});

module.exports = router;
