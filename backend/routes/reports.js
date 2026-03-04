const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const Profile = require("../models/Profile");
const Report = require("../models/Report");

router.post("/", requireAuth, async (req, res) => {
  try {
    const reporterUid = String(req.auth?.uid || "");
    const { type, profileUserId, reason, message = "", reviewId = null } = req.body || {};

    if (!reporterUid) return res.status(401).json({ message: "Brak autoryzacji." });
    if (!["profile", "review"].includes(type))
      return res.status(400).json({ message: "Nieprawidłowy typ." });
    if (!profileUserId) return res.status(400).json({ message: "Brak profileUserId." });
    if (!["spam", "fake", "abuse", "illegal", "other"].includes(reason))
      return res.status(400).json({ message: "Nieprawidłowy powód." });

    // ✅ ZMIANA: nie zgłaszaj własnego PROFILU, ale pozwól zgłosić OPINIĘ na własnym profilu
    if (type === "profile" && profileUserId === reporterUid) {
      return res.status(400).json({ message: "Nie możesz zgłosić własnego profilu." });
    }

    const profile = await Profile.findOne({ userId: profileUserId }).lean();
    if (!profile) return res.status(404).json({ message: "Nie znaleziono profilu." });

    let snap = { profileName: profile.name || "" };

    // jeśli review – sprawdź czy istnieje opinia
    if (type === "review") {
      if (!reviewId) return res.status(400).json({ message: "Brak reviewId." });

      const found = (profile.ratedBy || []).find((r) => String(r?._id) === String(reviewId));
      if (!found) return res.status(404).json({ message: "Nie znaleziono opinii." });

      snap.reviewUserName = found.userName || "";
      snap.reviewComment = found.comment || "";
      snap.reviewRating = Number(found.rating || 0);

      // (opcjonalnie) dodatkowa blokada: nie pozwalaj zgłosić swojej własnej opinii
      // jeśli w ratedBy masz userId autora opinii:
      // if (String(found.userId || "") === reporterUid) {
      //   return res.status(400).json({ message: "Nie możesz zgłosić własnej opinii." });
      // }
    }

    const doc = await Report.create({
      type,
      reporterUid,
      profileUserId,
      profileId: profile._id,
      profileSlug: profile.slug,
      reviewId: type === "review" ? reviewId : null,
      reason,
      message: String(message || "").trim().slice(0, 400),
      snapshot: snap,
    });

    return res.status(201).json({ ok: true, report: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "To zgłoszenie już jest otwarte." });
    }
    console.error("POST /api/reports error:", e);
    return res.status(500).json({ message: "Błąd serwera." });
  }
});

module.exports = router;