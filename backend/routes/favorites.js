const express = require('express');
const router = express.Router();

const Favorite = require('../models/Favorite');
const Profile  = require('../models/Profile');

// wymaga nagłówka uid
function requireUid(req, res, next) {
  const uid = req.headers?.uid;
  if (!uid) return res.status(401).json({ message: 'Brak nagłówka uid' });
  req.uid = uid;
  next();
}

/**
 * POST /api/favorites/toggle
 * body: { profileUserId }
 * headers: { uid }
 * zwraca: { isFav, count }
 */
router.post('/toggle', requireUid, async (req, res) => {
  try {
    const ownerUid = req.uid;
    const { profileUserId } = req.body || {};

    if (!profileUserId) return res.status(400).json({ message: 'profileUserId wymagane' });
    if (profileUserId === ownerUid) return res.status(400).json({ message: 'Nie możesz dodać własnego profilu' });

    const prof = await Profile.findOne({ userId: profileUserId }).lean();
    if (!prof) return res.status(404).json({ message: 'Profil nie istnieje' });

    const removed = await Favorite.findOneAndDelete({ ownerUid, profileUserId });

    let isFav;
    if (removed) {
      isFav = false;
      await Profile.updateOne(
        { userId: profileUserId },
        [
          {
            $set: {
              favoritesCount: {
                $max: [{ $subtract: [{ $ifNull: ['$favoritesCount', 0] }, 1] }, 0],
              },
            },
          },
        ]
      );
    } else {
      try {
        await Favorite.create({ ownerUid, profileUserId });
      } catch (e) {
        if (e?.code !== 11000) throw e; // duplikat – ignoruj
      }
      isFav = true;
      await Profile.updateOne(
        { userId: profileUserId },
        { $inc: { favoritesCount: 1 } }
      );
    }

    const doc = await Profile.findOne(
      { userId: profileUserId },
      { favoritesCount: 1, _id: 0 }
    ).lean();

    const count =
      typeof doc?.favoritesCount === 'number'
        ? doc.favoritesCount
        : await Favorite.countDocuments({ profileUserId });

    return res.json({ isFav, count });
  } catch (e) {
    console.error('POST /favorites/toggle error', e);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * GET /api/favorites/my
 * headers: { uid }
 */
router.get('/my', requireUid, async (req, res) => {
  try {
    const ownerUid = req.uid;

    const favs = await Favorite.find({ ownerUid })
      .select({ profileUserId: 1, _id: 0 })
      .lean();

    const ids = favs.map(f => f.profileUserId);
    if (ids.length === 0) return res.json([]);

    const profiles = await Profile.find(
      { userId: { $in: ids } },
      {
        userId: 1,
        name: 1,
        role: 1,
        avatar: 1,
        location: 1,
        rating: 1,
        reviews: 1,
        tags: 1,
        priceFrom: 1,
        priceTo: 1,
        showAvailableDates: 1,
        favoritesCount: 1,
        visits: 1,
        profileType: 1,
        description: 1,
        links: 1,
      }
    ).lean();

    const withFlag = profiles.map(p => ({ ...p, isFavorite: true }));
    return res.json(withFlag);
  } catch (e) {
    console.error('GET /favorites/my error', e);
    return res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
