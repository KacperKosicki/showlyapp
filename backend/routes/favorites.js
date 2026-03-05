// routes/favorites.js
const express = require("express");
const router = express.Router();

const Favorite = require("../models/Favorite");
const Profile = require("../models/Profile");

const requireAuth = require("../middleware/requireAuth");

/**
 * POST /api/favorites/toggle
 * body: { profileUserId }
 * AUTH: Bearer token
 * zwraca: { isFav, count }
 */
router.post("/toggle", requireAuth, async (req, res) => {
  try {
    const ownerUid = req.auth.uid; // ✅ tylko z tokena
    const { profileUserId } = req.body || {};

    if (!profileUserId) {
      return res.status(400).json({ message: "profileUserId wymagane" });
    }

    if (String(profileUserId) === String(ownerUid)) {
      return res.status(400).json({ message: "Nie możesz dodać własnego profilu" });
    }

    const prof = await Profile.findOne({ userId: profileUserId }).lean();
    if (!prof) {
      return res.status(404).json({ message: "Profil nie istnieje" });
    }

    const removed = await Favorite.findOneAndDelete({ ownerUid, profileUserId });

    let isFav;
    if (removed) {
      isFav = false;

      // bezpieczne zejście do zera
      await Profile.updateOne(
        { userId: profileUserId },
        [
          {
            $set: {
              favoritesCount: {
                $max: [{ $subtract: [{ $ifNull: ["$favoritesCount", 0] }, 1] }, 0],
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
      await Profile.updateOne({ userId: profileUserId }, { $inc: { favoritesCount: 1 } });
    }

    const doc = await Profile.findOne(
      { userId: profileUserId },
      { favoritesCount: 1, _id: 0 }
    ).lean();

    const count =
      typeof doc?.favoritesCount === "number"
        ? doc.favoritesCount
        : await Favorite.countDocuments({ profileUserId });

    return res.json({ isFav, count });
  } catch (e) {
    console.error("POST /favorites/toggle error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * GET /api/favorites/my
 * AUTH: Bearer token
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const ownerUid = req.auth.uid; // ✅ tylko z tokena

    const favs = await Favorite.find({ ownerUid })
      .select({ profileUserId: 1, _id: 0 })
      .lean();

    const ids = favs.map((f) => f.profileUserId);
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

        // ✅ DODAJ TO:
        theme: 1,

        // (opcjonalnie, ale polecam żeby UserCard miał komplet danych jak wszędzie)
        slug: 1,
        bookingMode: 1,
        availableDates: 1,
      }
    ).lean();

    return res.json(profiles.map((p) => ({ ...p, isFavorite: true })));
  } catch (e) {
    console.error("GET /favorites/my error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;