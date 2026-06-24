// routes/admin.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const User = require("../models/User");
const Profile = require("../models/Profile");
const Reservation = require("../models/Reservation");
const Report = require("../models/Report");
const { sendSystemMessage } = require("../utils/systemMessages");
const firebaseAdmin = require("../utils/firebaseAdmin");
const {
  syncAllFirebaseUsersToMongo,
  syncFirebaseUserToMongo,
} = require("../utils/syncFirebaseUser");

async function syncAuthUsersSafely() {
  try {
    return await syncAllFirebaseUsersToMongo();
  } catch (error) {
    console.error("Firebase users sync error:", error);
    return {
      scanned: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      conflicts: 0,
      error: error.message,
    };
  }
}

function toCreatedByAccount(owner) {
  if (!owner) return null;

  return {
    email: owner.email || "",
    name: owner.displayName || owner.name || "",
    firebaseUid: owner.firebaseUid || owner.uid || "",
  };
}

async function addFirebaseOwnersToMap(ownersByUid, ownerUids) {
  const missingUids = ownerUids.filter((uid) => !ownersByUid.has(uid));
  if (missingUids.length === 0) return;

  const batchSize = 100;

  for (let i = 0; i < missingUids.length; i += batchSize) {
    const batch = missingUids.slice(i, i + batchSize);

    try {
      const result = await firebaseAdmin
        .auth()
        .getUsers(batch.map((uid) => ({ uid })));

      await Promise.all(
        result.users.map(async (firebaseUser) => {
          const syncResult = await syncFirebaseUserToMongo(firebaseUser);
          const syncedUser =
            syncResult?.user?.toObject?.() || syncResult?.user || null;

          ownersByUid.set(firebaseUser.uid, {
            email: syncedUser?.email || firebaseUser.email || "",
            name:
              syncedUser?.displayName ||
              syncedUser?.name ||
              firebaseUser.displayName ||
              "",
            firebaseUid: syncedUser?.firebaseUid || firebaseUser.uid,
          });
        })
      );
    } catch (error) {
      console.error("Firebase profile owners lookup error:", error);
    }
  }
}

// ✅ Statystyki (admin only)
router.get("/stats", requireAuth, requireRole(["admin"]), async (req, res) => {
  const usersSync = await syncAuthUsersSafely();

  const [users, profiles, reservations] = await Promise.all([
    User.countDocuments(),
    Profile.countDocuments(),
    Reservation.countDocuments(),
  ]);

  return res.json({ users, profiles, reservations, usersSync });
});

// ✅ Lista userów (admin only)
router.get("/users", requireAuth, requireRole(["admin"]), async (req, res) => {
  const usersSync = await syncAuthUsersSafely();

  const limit = Math.min(Number(req.query.limit || 50), 200);
  const page = Math.max(Number(req.query.page || 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  return res.json({ items, total, page, limit, usersSync });
});

// ✅ Zmiana roli (admin only)
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { role } = req.body;

  const allowed = ["user", "mod", "admin"];
  if (!allowed.includes(role)) {
    return res.status(400).json({ message: "Nieprawidłowa rola" });
  }

  // opcjonalnie blokada, żeby nie zdjąć sobie admina
  if (String(req.dbUser?._id) === String(req.params.id) && role !== "admin") {
    return res.status(400).json({ message: "Nie możesz odebrać sobie roli admin" });
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Nie znaleziono użytkownika" });
  }

  return res.json(updated);
});

// ✅ Usuwanie usera z Mongo (admin only) — UWAGA: nie usuwa z Firebase!
router.delete("/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) {
    return res.status(404).json({ message: "Nie znaleziono użytkownika" });
  }
  return res.json({ ok: true });
});

// ✅ Lista profili (admin + mod)
router.get("/profiles", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const page = Math.max(Number(req.query.page || 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Profile.find()
      .select(
        "name userId slug isVisible visibleUntil createdAt partnership"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Profile.countDocuments(),
  ]);

  const ownerUids = [
    ...new Set(
      items
        .map((profile) => String(profile.userId || "").trim())
        .filter(Boolean)
    ),
  ];

  const owners = ownerUids.length
    ? await User.find({ firebaseUid: { $in: ownerUids } })
        .select("email name displayName firebaseUid")
        .lean()
    : [];

  const ownersByUid = new Map(
    owners.map((owner) => [String(owner.firebaseUid || "").trim(), owner])
  );

  await addFirebaseOwnersToMap(ownersByUid, ownerUids);

  const itemsWithAccounts = items.map((profile) => {
    const owner = ownersByUid.get(String(profile.userId || "").trim());

    return {
      ...profile,
      createdByAccount: toCreatedByAccount(owner),
    };
  });

  return res.json({ items: itemsWithAccounts, total, page, limit });
});

// ✅ toggle isVisible (admin + mod)
router.patch(
  "/profiles/:id/visible",
  requireAuth,
  requireRole(["admin", "mod"]),
  async (req, res) => {
    try {
      const { isVisible } = req.body;

      const profile = await Profile.findById(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu" });
      }

      profile.isVisible = !!isVisible;
      await profile.save();

      const profileOwnerUid = String(profile.userId || "").trim();
      const profileName = String(profile.name || "Twój profil").trim();

      if (profileOwnerUid) {
        if (!isVisible) {
          await sendSystemMessage(
            profileOwnerUid,
            [
              `⛔ Twój profil „${profileName}” został wyłączony przez administrację.`,
              "",
              "Jeśli uważasz, że to błąd lub chcesz wyjaśnić sytuację, skontaktuj się z administracją Showly.",
              "",
              "Do czasu wyjaśnienia profil może pozostać niewidoczny."
            ].join("\n")
          );
        } else {
          await sendSystemMessage(
            profileOwnerUid,
            [
              `✅ Twój profil „${profileName}” został ponownie aktywowany przez administrację.`,
              "",
              "Profil jest ponownie widoczny w serwisie Showly."
            ].join("\n")
          );
        }
      }

      return res.json(profile);
    } catch (e) {
      console.error("❌ admin toggle profile visibility error:", e);
      return res.status(500).json({ message: "Błąd serwera", error: e.message });
    }
  }
);

// ✅ ustawienie partnerstwa profilu (admin + mod)
router.patch(
  "/profiles/:id/partnership",
  requireAuth,
  requireRole(["admin", "mod"]),
  async (req, res) => {
    try {
      const profile = await Profile.findById(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const input = req.body?.partnership || {};

      const isPartner = !!input.isPartner;
      const tier = String(input.tier || (isPartner ? "partner" : "none")).trim();
      const badgeText = String(input.badgeText || "").trim();
      const label = String(input.label || "").trim();
      const color = String(input.color || "#59d0ff").trim();
      const priority = Number.isFinite(Number(input.priority))
        ? Number(input.priority)
        : 0;
      const since = input.since ? new Date(input.since) : profile.partnership?.since || null;

      profile.partnership = {
        ...(profile.partnership?.toObject ? profile.partnership.toObject() : profile.partnership || {}),
        isPartner,
        tier: isPartner ? tier : "none",
        label: isPartner ? label : "",
        badgeText: isPartner ? badgeText : "",
        color: isPartner ? color : "#59d0ff",
        priority,
        since:
          since instanceof Date && !Number.isNaN(since.getTime())
            ? since
            : null,
      };

      await profile.save();

      return res.json({
        message: "Partnerstwo profilu zostało zaktualizowane.",
        profile,
      });
    } catch (e) {
      return res.status(500).json({
        message: "Nie udało się zaktualizować partnerstwa profilu.",
        error: e.message,
      });
    }
  }
);

// ✅ lista zgłoszeń (admin + mod)
router.get("/reports", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const status = String(req.query.status || "open");
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const page = Math.max(Number(req.query.page || 1), 1);
  const skip = (page - 1) * limit;

  const q = ["open", "closed"].includes(status) ? { status } : {};

  const [items, total] = await Promise.all([
    Report.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments(q),
  ]);

  return res.json({ items, total, page, limit });
});

// ✅ zamknij zgłoszenie (admin + mod)
router.patch("/reports/:id/close", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const { adminNote = "" } = req.body || {};

  const updated = await Report.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status: "closed",
        adminNote: String(adminNote).trim().slice(0, 400),
      },
    },
    { new: true }
  ).lean();

  if (!updated) {
    return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
  }

  return res.json(updated);
});

// ✅ moderacja: usuń opinię z profilu (admin + mod) + wyślij wiadomość systemową
router.delete(
  "/reports/:id/remove-review",
  requireAuth,
  requireRole(["admin", "mod"]),
  async (req, res) => {
    try {
      const { adminNote = "" } = req.body || {};

      const rep = await Report.findById(req.params.id);
      if (!rep) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
      }

      if (rep.type !== "review" || !rep.reviewId) {
        return res.status(400).json({ message: "To nie jest zgłoszenie opinii." });
      }

      const profile = await Profile.findOne({ userId: rep.profileUserId });
      if (!profile) {
        return res.status(404).json({ message: "Nie znaleziono profilu." });
      }

      const review = Array.isArray(profile.ratedBy)
        ? profile.ratedBy.find((r) => String(r._id) === String(rep.reviewId))
        : null;

      if (!review) {
        await Report.findByIdAndUpdate(rep._id, {
          $set: {
            status: "closed",
            adminNote: "Opinia nie istniała już w profilu.",
          },
        });

        return res.status(404).json({ message: "Nie znaleziono opinii w profilu." });
      }

      const reviewAuthorUid = String(review.userId || "").trim();
      const reviewComment = String(review.comment || "").trim();
      const profileName = String(profile.name || "ten profil").trim();

      profile.ratedBy = profile.ratedBy.filter(
        (r) => String(r._id) !== String(rep.reviewId)
      );

      const total = profile.ratedBy.reduce(
        (sum, r) => sum + Number(r.rating || 0),
        0
      );

      profile.reviews = profile.ratedBy.length;
      profile.rating =
        profile.reviews > 0
          ? Number((total / profile.reviews).toFixed(2))
          : 0;

      await profile.save();

      const finalAdminNote = String(adminNote || "").trim().slice(0, 400);

      await Report.updateMany(
        {
          type: "review",
          profileUserId: rep.profileUserId,
          reviewId: rep.reviewId,
          status: "open",
        },
        {
          $set: {
            status: "closed",
            adminNote: finalAdminNote || "Usunięto opinię.",
          },
        }
      );

      if (reviewAuthorUid) {
        const safeSnippet =
          reviewComment.length > 180
            ? `${reviewComment.slice(0, 180)}...`
            : reviewComment;

        const messageLines = [
          `🛡️ Administrator Showly usunął Twoją opinię z profilu „${profileName}”.`,
          "",
          `Powód: ${finalAdminNote || "naruszenie zasad publikacji opinii."}`,
          "",
          "Usunięta treść:",
          `„${safeSnippet || "Brak treści"}”`,
          "",
          "Możesz dodać nową opinię, jeśli będzie zgodna z zasadami serwisu.",
        ];

        await sendSystemMessage(reviewAuthorUid, messageLines.join("\n"));
      }

      return res.json({
        ok: true,
        message: "Opinia została usunięta, zgłoszenia zamknięte, autor poinformowany.",
        profile,
      });
    } catch (err) {
      console.error("❌ admin remove-review error:", err);
      return res.status(500).json({ message: "Błąd podczas usuwania opinii." });
    }
  }
);

module.exports = router;
