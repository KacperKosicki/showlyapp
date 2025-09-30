const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User'); // 👈 dodaj to
const Conversation = require('../models/Conversation');

// Pomocnicza funkcja do tworzenia slugów
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD") // usuwa diakrytyki (ó → o)
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

const VisitLock = require('../models/VisitLock'); // 👈 NOWE

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

// GET /api/profiles – tylko aktywne i ważne (wg visibleUntil)
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

// GET /api/profiles/by-user/:uid – pobierz profil po userId
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

// GET /api/profiles/slug/:slug – pobierz profil po unikalnym slugu
router.get('/slug/:slug', async (req, res) => {
  try {
    const profile = await Profile.findOne({ slug: req.params.slug });

    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu.' });
    }

    // ⛔ ZABLOKUJ dostęp jeśli profil nie jest widoczny lub wygasł
    const now = new Date();
    if (!profile.isVisible || profile.visibleUntil < now) {
      return res.status(403).json({ message: 'Profil jest obecnie niewidoczny.' });
    }

    res.json(profile);
  } catch (err) {
    console.error('❌ Błąd w GET /slug/:slug:', err);
    res.status(500).json({ message: 'Błąd serwera.' });
  }
});

// PATCH /api/profiles/:uid/visit — zlicz odwiedziny (anty-spam włączony)
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

// PATCH /api/profiles/slug/:slug/visit — zlicz po slugu (anty-spam włączony)
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

router.post('/', async (req, res) => {
  console.log('📦 Żądanie do /api/profiles:', req.body);

  // bezpieczne Stringi – żeby .trim() nie wywaliło przy undefined
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

    // slug
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
      visibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // ⚠️ już 30 dni, nie 1 min
    });

    await newProfile.save();

    // ✅ najpierw odpowiedź do frontu
    res.status(201).json({ message: 'Profil utworzony', profile: newProfile });

    // 🔔 „fire-and-forget” – NIE czekamy, nie psujemy 201
    queueMicrotask(async () => {
      try {
        const fromUid = 'SYSTEM';
        const toUid = userId;                              // ← właściciel nowego profilu
        const pairKey = [fromUid, toUid].sort().join('|');

        const welcomeContent = [
          '🎉 Dziękujemy za utworzenie profilu w Showly!',
          '',
          'Co dalej?',
          '• Uzupełnij sekcję „Wygląd i opis” oraz dodaj usługi/cennik.',
          '• Włącz wybrany tryb rezerwacji w ustawieniach profilu.',
          '• Udostępnij link do swojej wizytówki znajomym lub klientom.',
          '',
          'Powodzenia! 👊'
        ].join('\n');

        // 1) Szukamy istniejącej konwersacji systemowej
        let convo = await Conversation.findOne({ channel: 'system', pairKey }).exec();

        if (!convo) {
          // 2) Nie ma? Tworzymy NOWĄ konwersację z 1. wiadomością
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
          // 3) Jest? Dopinamy kolejną wiadomość
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


// PATCH /api/profiles/extend/:uid – przedłuż widoczność profilu o 30 dni
router.patch('/extend/:uid', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu do przedłużenia.' });
    }

    profile.isVisible = true;
    profile.visibleUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dni
    await profile.save();

    res.json({ message: 'Widoczność przedłużona o 30 dni.', profile });
  } catch (error) {
    console.error('❌ Błąd w PATCH /api/profiles/extend:', error);
    res.status(500).json({ message: 'Błąd podczas przedłużania widoczności', error });
  }
});

// PATCH /api/profiles/update/:uid – aktualizacja wybranych pól profilu
router.patch('/update/:uid', async (req, res) => {
  const allowedFields = [
    'avatar',
    'photos',
    'profileType', 'location', 'priceFrom', 'priceTo',
    'role', 'availableDates', 'description', 'tags', 'links',
    'quickAnswers',
    'showAvailableDates',
    'services',
    'bookingMode',
    'workingHours',
    'workingDays',
  ];

  try {
    const profile = await Profile.findOne({ userId: req.params.uid });
    if (!profile) return res.status(404).json({ message: 'Nie znaleziono profilu.' });

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    }

    await profile.save();
    res.json({ message: 'Profil zaktualizowany', profile });

  } catch (err) {
    console.error('❌ Błąd aktualizacji profilu:', err);
    res.status(500).json({ message: 'Błąd podczas aktualizacji profilu.' });
  }
});

router.patch('/rate/:slug', async (req, res) => {
  const { userId, rating, comment } = req.body;
  const numericRating = Number(rating);

  // 🔒 Walidacja danych
  if (
    !userId ||
    isNaN(numericRating) ||
    numericRating < 1 ||
    numericRating > 5 ||
    !comment ||
    comment.trim().length < 5 ||
    comment.trim().length > 100
  ) {
    return res.status(400).json({
      message: 'Ocena musi być liczbą od 1 do 5, a komentarz musi mieć od 5 do 100 znaków.'
    });
  }

  try {
    const profile = await Profile.findOne({ slug: req.params.slug });
    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu.' });
    }

    if (profile.userId === userId) {
      return res.status(403).json({ message: 'Nie możesz ocenić własnej wizytówki.' });
    }

    const alreadyRated = profile.ratedBy.find(r => r.userId === userId);
    if (alreadyRated) {
      return res.status(400).json({ message: 'Już oceniłeś ten profil.' });
    }

    const user = await User.findOne({ firebaseUid: userId });
    const userName = user?.name || 'Użytkownik';

    // ✅ Dodanie oceny
    profile.ratedBy.push({
      userId,
      rating: numericRating,
      comment,
      userName
    });

    // 🔢 Aktualizacja średniej oceny
    const totalRatings = profile.ratedBy.reduce((sum, r) => sum + r.rating, 0);
    profile.rating = Number((totalRatings / profile.ratedBy.length).toFixed(2));
    profile.reviews = profile.ratedBy.length;

    await profile.save();
    res.json({
      message: 'Ocena dodana.',
      rating: profile.rating,
      reviews: profile.reviews
    });

  } catch (err) {
    console.error('❌ Błąd oceniania:', err);
    res.status(500).json({ message: 'Błąd serwera.' });
  }
});

module.exports = router;
