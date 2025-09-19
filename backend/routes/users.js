const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const User = require('../models/User');

/* =========================
   Multer – upload avatara
   ========================= */
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'jpg';
    cb(null, `${req.params.uid}-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Tylko obrazy'));
    cb(null, true);
  },
});

function absoluteUrl(req, relative) {
  // składa absolutny URL: http(s)://host/relative
  return `${req.protocol}://${req.get('host')}${relative.startsWith('/') ? '' : '/'}${relative}`;
}

/* =========================
   Twoje dotychczasowe endpointy
   ========================= */

// POST /api/users – dodaje użytkownika do bazy (jeśli nie istnieje)
router.post('/', async (req, res) => {
  console.log('🧾 Żądanie do /api/users:', req.body);

  const { email, name, firebaseUid, provider } = req.body;

  if (!email || !firebaseUid || !provider) {
    return res
      .status(400)
      .json({ message: 'Brakuje wymaganych danych (email, uid lub provider)' });
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

/* =========================
   Nowe endpointy – profil użytkownika
   ========================= */

// GET /api/users/:uid – pobierz usera po firebaseUid
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Błąd serwera', error: e.message });
  }
});

// PATCH /api/users/:uid – proste aktualizacje danych
router.patch('/:uid', async (req, res) => {
  try {
    const { displayName, avatar, name } = req.body;
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    if (typeof displayName === 'string') user.displayName = displayName;
    if (typeof name === 'string') user.name = name;
    if (typeof avatar === 'string') user.avatar = avatar;

    await user.save();
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ message: 'Błąd aktualizacji', error: e.message });
  }
});

// POST /api/users/:uid/avatar – upload pliku (multipart/form-data)
router.post('/:uid/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Brak pliku' });

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    // Jeśli poprzedni avatar był w /uploads/avatars/, usuń z dysku
    if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }

    const publicPath = `/uploads/avatars/${req.file.filename}`;
    const url = absoluteUrl(req, publicPath);

    user.avatar = url;
    await user.save();

    res.json({ url });
  } catch (e) {
    console.error('Upload avatar error:', e);
    res.status(500).json({ message: 'Błąd uploadu', error: e.message });
  }
});

// DELETE /api/users/:uid/avatar – usuń avatar (i plik z dysku, jeśli nasz)
router.delete('/:uid/avatar', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    if (user.avatar && user.avatar.includes('/uploads/avatars/')) {
      const diskPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      fs.unlink(diskPath, () => {});
    }

    user.avatar = '';
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('Delete avatar error:', e);
    res.status(500).json({ message: 'Błąd usuwania', error: e.message });
  }
});

module.exports = router;
