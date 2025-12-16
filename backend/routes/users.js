// routes/users.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const User = require('../models/User');
const cloudinary = require('../config/cloudinary'); // ✅ popraw ścieżkę jeśli trzeba

/* =========================
   Helpers
   ========================= */

// wyciągamy public_id z URL Cloudinary, żeby móc usuwać stary obraz
function getCloudinaryPublicId(url = '') {
  try {
    if (!url.includes('res.cloudinary.com')) return null;

    // np: https://res.cloudinary.com/<cloud>/image/upload/v123/showly/avatars/UID_123.jpg
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;

    const withoutVersion = afterUpload.replace(/^v\d+\//, ''); // usuń v123/
    const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, ''); // usuń .jpg/.png
    return withoutExt; // "showly/avatars/UID_123"
  } catch {
    return null;
  }
}

// twarda walidacja https url (dla avatar-url)
function isHttpsUrl(u = '') {
  return /^https:\/\/.+/i.test(String(u || '').trim());
}

/* =========================
   Multer – upload do RAM
   ========================= */
const upload = multer({
  storage: multer.memoryStorage(),
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
 * Dodaje użytkownika do bazy (jeśli nie istnieje)
 */
router.post('/', async (req, res) => {
  console.log('🧾 Żądanie do /api/users:', req.body);

  const { email, name, firebaseUid, provider } = req.body;

  if (!email || !firebaseUid || !provider) {
    return res.status(400).json({
      message: 'Brakuje wymaganych danych (email, uid lub provider)',
    });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.firebaseUid !== firebaseUid) {
        return res.status(409).json({ message: 'E-mail jest już powiązany z innym kontem.' });
      }
      return res.status(200).json({
        message: 'Użytkownik już istnieje',
        user: existingUser.toObject(),
      });
    }

    const newUser = new User({ email, name, firebaseUid, provider });
    await newUser.save();

    return res.status(201).json({
      message: 'Użytkownik dodany do bazy',
      user: newUser.toObject(),
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
  if (user) return res.status(200).json({ exists: true, provider: user.provider });
  return res.status(200).json({ exists: false });
});

/** GET /api/users/:uid
 * Zwraca dane usera (avatar to już https URL)
 */
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid }).lean();
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
    return res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Błąd serwera', error: e.message });
  }
});

/** PATCH /api/users/:uid
 * Aktualizacje danych (displayName, name, avatar)
 * avatar przyjmuje tylko https:// (Cloudinary albo inne CDN)
 */
router.patch('/:uid', async (req, res) => {
  try {
    const { displayName, avatar, name } = req.body;

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    if (typeof displayName === 'string') user.displayName = displayName;
    if (typeof name === 'string') user.name = name;

    if (typeof avatar === 'string') {
      const a = avatar.trim();
      if (!a) {
        user.avatar = '';
      } else if (!isHttpsUrl(a)) {
        return res.status(400).json({ message: 'avatar musi być https://...' });
      } else {
        // jeżeli zmieniasz avatar ręcznie url-em, usuń stary z cloudinary jeśli był
        const oldPublicId = getCloudinaryPublicId(user.avatar);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch {}
        }
        user.avatar = a;
      }
    }

    await user.save();

    res.json({ ok: true, user: user.toObject() });
  } catch (e) {
    res.status(500).json({ message: 'Błąd aktualizacji', error: e.message });
  }
});

/** POST /api/users/:uid/avatar
 * Upload pliku -> Cloudinary -> zapis secure_url w DB
 */
router.post('/:uid/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Brak pliku' });

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    // usuń stary avatar z Cloudinary (jeśli był)
    const oldPublicId = getCloudinaryPublicId(user.avatar);
    if (oldPublicId) {
      try { await cloudinary.uploader.destroy(oldPublicId); } catch {}
    }

    // upload do Cloudinary z bufora
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'showly/avatars',
          public_id: `${req.params.uid}_${Date.now()}`,
          resource_type: 'image',
          overwrite: true,
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    user.avatar = uploaded.secure_url;
    await user.save();

    return res.json({ url: uploaded.secure_url });
  } catch (e) {
    console.error('Upload avatar (cloudinary) error:', e);
    res.status(500).json({ message: 'Błąd uploadu', error: e.message });
  }
});

/** PATCH /api/users/:uid/avatar-url
 * Ustawienie avatara na zewnętrzny HTTPS URL
 * + usuń stary cloudinary jeśli był
 */
router.patch('/:uid/avatar-url', async (req, res) => {
  try {
    const { url } = req.body;
    const next = String(url || '').trim();

    if (!isHttpsUrl(next)) {
      return res.status(400).json({ message: 'Podaj poprawny HTTPS URL.' });
    }

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    const oldPublicId = getCloudinaryPublicId(user.avatar);
    if (oldPublicId) {
      try { await cloudinary.uploader.destroy(oldPublicId); } catch {}
    }

    user.avatar = next;
    await user.save();

    res.json({ ok: true, avatar: user.avatar });
  } catch (e) {
    res.status(500).json({ message: 'Błąd', error: e.message });
  }
});

/** DELETE /api/users/:uid/avatar
 * Usuwa avatar (jeśli z Cloudinary – usuwa plik), czyści pole w DB
 */
router.delete('/:uid/avatar', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'Nie znaleziono użytkownika' });

    const publicId = getCloudinaryPublicId(user.avatar);
    if (publicId) {
      try { await cloudinary.uploader.destroy(publicId); } catch {}
    }

    user.avatar = '';
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('Delete avatar (cloudinary) error:', e);
    res.status(500).json({ message: 'Błąd usuwania', error: e.message });
  }
});

module.exports = router;
