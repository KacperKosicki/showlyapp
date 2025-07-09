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

// GET /api/profiles – tylko aktywne i ważne (wg visibleUntil)
router.get('/', async (req, res) => {
  try {
    const allProfiles = await Profile.find();
    const now = new Date();
    const visibleProfiles = [];

    for (const profile of allProfiles) {
      if (profile.visibleUntil && profile.visibleUntil < now && profile.isVisible) {
        profile.isVisible = false;
        await profile.save();
      }

      if (profile.visibleUntil && profile.visibleUntil >= now && profile.isVisible) {
        visibleProfiles.push(profile);
      }
    }

    res.json(visibleProfiles);

  } catch (error) {
    console.error('❌ Błąd w GET /api/profiles:', error);
    res.status(500).json({ message: 'Błąd pobierania profili', error });
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

// POST /api/profiles – utwórz nowy profil z widocznością na 30 dni
router.post('/', async (req, res) => {
  console.log('📦 Żądanie do /api/profiles:', req.body);

  const { userId, name, role, location } = req.body;

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

    // Generowanie unikalnego sluga
    const baseSlug = slugify(`${name}-${role}`);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Profile.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const newProfile = new Profile({
      ...req.body,
      slug: uniqueSlug,
      isVisible: true,
      visibleUntil: new Date(Date.now() + 1 * 60 * 1000) // 1 minuta do testów
    });

    await newProfile.save();

    // 📩 AUTOMATYCZNA WIADOMOŚĆ SYSTEMOWA
    const user = await User.findOne({ firebaseUid: userId });
    if (user) {
      const fromUid = 'SYSTEM';
      const fromName = 'Showly.app';
      const toUid = userId;
      const toName = user.name || user.email;

      const welcomeContent = `
        🎉 Dziękujemy za utworzenie swojego profilu w Showly!

        Twój profil jest już aktywny i dostępny publicznie. Od teraz możesz:
        – otrzymywać wiadomości od innych użytkowników,
        – zbierać opinie i oceny,
        – promować swoją działalność lub pasję.

        🔧 Co możesz teraz zrobić dalej?

        👉 Dodaj zdjęcia – zaprezentuj swoje realizacje, miejsce pracy lub atmosferę działań  
        👉 Dodaj usługi i ceny – pokaż, co oferujesz i w jakim zakresie cenowym  
        👉 Dodaj linki do social mediów – YouTube, Instagram, TikTok, portfolio  
        👉 Rozbuduj opis – uzupełnij informacje o sobie lub swojej działalności  
        👉 Zbieraj opinie – poproś znajomych lub klientów o wystawienie oceny

        W przyszłości pojawią się także nowe funkcje: rezerwacje, statystyki, galerie rozszerzone i wiele więcej.

        Aplikacja jest obecnie w fazie testów – korzystasz z niej całkowicie za darmo. Wkrótce poprosimy Cię również o opinię i sugestie.

        Dziękujemy, że pomagasz rozwijać Showly 💙

        — Zespół Showly
      `;

      const existingConvo = await Conversation.findOne({
        'participants.uid': { $all: [fromUid, toUid] }
      });

      if (existingConvo) {
        existingConvo.messages.push({
          fromUid,
          fromName,
          toUid,
          toName,
          content: welcomeContent,
          isSystem: true
        });
        existingConvo.updatedAt = new Date();
        await existingConvo.save();
      } else {
        await Conversation.create({
          participants: [
            { uid: fromUid, name: fromName },
            { uid: toUid, name: toName }
          ],
          messages: [
            {
              fromUid,
              fromName,
              toUid,
              toName,
              content: welcomeContent,
              isSystem: true
            }
          ]
        });
      }
    }

    res.status(201).json({ message: 'Profil utworzony', profile: newProfile });

  } catch (err) {
    console.error('❌ Błąd w POST /api/profiles:', err);
    res.status(500).json({ message: 'Błąd tworzenia profilu', error: err });
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
    'availabilityDate', 'description', 'tags', 'links',
    'quickAnswers'
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
