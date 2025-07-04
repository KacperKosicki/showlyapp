const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/users – dodaje użytkownika do bazy (jeśli nie istnieje)
router.post('/', async (req, res) => {
  console.log('🧾 Żądanie do /api/users:', req.body);

  const { email, name, firebaseUid, provider } = req.body;

  if (!email || !firebaseUid || !provider) {
    return res.status(400).json({ message: 'Brakuje wymaganych danych (email, uid lub provider)' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.firebaseUid !== firebaseUid) {
        return res.status(409).json({ message: 'E-mail jest już powiązany z innym kontem.' });
      } else {
        return res.status(200).json({ message: 'Użytkownik już istnieje', user: existingUser });
      }
    }

    const newUser = new User({ email, name, firebaseUid, provider });
    await newUser.save();
    res.status(201).json({ message: 'Użytkownik dodany do bazy', user: newUser });
  } catch (error) {
    console.error('❌ Błąd w /api/users:', error);
    res.status(500).json({ message: 'Błąd serwera', error });
  }
});

// GET /api/users/check-email?email=...
router.get('/check-email', async (req, res) => {
  const email = req.query.email?.toLowerCase();
  if (!email) return res.status(400).json({ message: 'Brak emaila w zapytaniu' });

  const user = await User.findOne({ email });
  if (user) {
    return res.status(200).json({ exists: true, provider: user.provider });
  } else {
    return res.status(200).json({ exists: false });
  }
});

module.exports = router;
