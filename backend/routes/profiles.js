const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');

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

module.exports = router;
