const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const User = require('../models/User');

/* =========================
   URL helpers (https za proxy + pełne URL-e)
   ========================= */
function getProto(req) {
  const xf = req.headers['x-forwarded-proto'];
  if (xf) return String(xf).split(',')[0].trim(); // "https" np. na Render/CF
  return req.protocol || 'https';
}

function absoluteUrl(req, relative) {
  const proto = getProto(req);
  const host = req.get('host');
  return `${proto}://${host}${relative.startsWith('/') ? '' : '/'}${relative}`;
}

/** Zwraca publiczny URL:
 *  - jeśli wartość zaczyna się od "/uploads/" -> dokleja host i protokół
 *  - jeśli już jest https:// -> zostawia
 *  - w innych przypadkach -> pusty string (bezpiecznie)
 */
function toPublicUrl(req, val = '') {
  if (!val) return '';
  if (val.startsWith('/uploads/')) return absoluteUrl(req, val);
  if (/^https:\/\/.+/i.test(val)) return val;
  return '';
}

// (opcjonalnie) Zamienia publiczny URL na ścieżkę dyskową
function filePathFromPublicUrl(publicUrl) {
  try {
    const pathname = new URL(publicUrl).pathname; // "/uploads/avatars/xxx.jpg"
    return path.join(__dirname, '..', pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

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

/* =========================
   Endpointy użytkownika
   ========================= */

/** POST /api/users
 *  Dodaje użytkownika do bazy (jeśli nie istnieje)
 */
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
        // Ujednolicamy avatar w odpowiedzi
        const avatar = toPublicUrl(req, existingUser.avatar);
        return res.status(200).json({
          message: 'Użytkownik już istnieje',
          user: { ...existingUser.toObject(), avatar }
        });
      }
    }

    const newUser = new User({ email, name, firebaseUid, provider });
    await newUser.save();

    return res.status(201).json({
      message: 'Użytkownik dodany do bazy',
      user: { ...newUser.toObject(), avatar: toPublicUrl(req, newUser.avatar) }
    });
  } catch (error) {
    console.error('❌ Błąd w /api/users:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

/** GET /api/users/check-email?email=... */
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

/** GET /api/users/:uid
 *  Zwraca dane usera, avatar jako absolutny URL
 */
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid }).lean();
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    return res.json({ ...user, avatar: toPublicUrl(req, user.avatar) });
  } catch (e) {
    res.status(500).json({ message: 'Błąd serwera', error: e.message });
  }
});

/** PATCH /api/users/:uid
 *  Proste aktualizacje danych (displayName, name, avatar)
 *  avatar przyjmuje: pełny https:// albo względne /uploads/...
 */
router.patch('/:uid', async (req, res) => {
  try {
    const { displayName, avatar, name } = req.body;
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    if (typeof displayName === 'string') user.displayName = displayName;
    if (typeof name === 'string') user.name = name;

    if (typeof avatar === 'string') {
      if (avatar.startsWith('/uploads/')) {
        user.avatar = avatar;
      } else if (/^https:\/\/.+/i.test(avatar)) {
        user.avatar = avatar;
      } else {
        return res.status(400).json({ message: 'avatar musi być https:// lub /uploads/...' });
      }
    }

    await user.save();

    // zwróć spójnie z-normalizowany avatar
    res.json({ ok: true, user: { ...user.toObject(), avatar: toPublicUrl(req, user.avatar) } });
  } catch (e) {
    res.status(500).json({ message: 'Błąd aktualizacji', error: e.message });
  }
});

/** POST /api/users/:uid/avatar
 *  Upload pliku, zapis ścieżki względnej w DB, zwrot pełnego URL-a
 */
router.post('/:uid/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Brak pliku' });

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    // Usuń stary plik jeśli był nasz
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldDiskPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      fs.unlink(oldDiskPath, () => {});
    }

    const publicPath = `/uploads/avatars/${req.file.filename}`;

    // ZAPISUJEMY TYLKO ŚCIEŻKĘ WZGLĘDNĄ
    user.avatar = publicPath;
    await user.save();

    // W odpowiedzi zwracamy pełny URL
    res.json({ url: absoluteUrl(req, publicPath) });
  } catch (e) {
    console.error('Upload avatar error:', e);
    res.status(500).json({ message: 'Błąd uploadu', error: e.message });
  }
});

/** PATCH /api/users/:uid/avatar-url
 *  Ustawienie avatara na zewnętrzny HTTPS URL.
 *  Jeżeli dotychczas był lokalny plik — usuwamy go.
 */
router.patch('/:uid/avatar-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !/^https:\/\/.+/i.test(url)) {
      return res.status(400).json({ message: 'Podaj poprawny HTTPS URL.' });
    }
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    // usuń stary lokalny plik (jeśli był)
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const diskPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      fs.unlink(diskPath, () => {});
    }

    user.avatar = url;
    await user.save();

    res.json({ ok: true, avatar: toPublicUrl(req, user.avatar) });
  } catch (e) {
    res.status(500).json({ message: 'Błąd', error: e.message });
  }
});

/** DELETE /api/users/:uid/avatar
 *  Usuwa avatar (i plik, jeśli lokalny), czyści pole w DB.
 */
router.delete('/:uid/avatar', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    // jeśli trzymamy względną ścieżkę – usuńmy plik z dysku
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
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
