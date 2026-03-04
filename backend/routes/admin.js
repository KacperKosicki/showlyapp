// routes/admin.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const User = require("../models/User");
const Profile = require("../models/Profile");
const Reservation = require("../models/Reservation");
const Report = require("../models/Report");

// ✅ Statystyki (admin only)
router.get("/stats", requireAuth, requireRole(["admin"]), async (req, res) => {
  const [users, profiles, reservations] = await Promise.all([
    User.countDocuments(),
    Profile.countDocuments(),
    Reservation.countDocuments(),
  ]);

  return res.json({ users, profiles, reservations });
});

// ✅ Lista userów (admin only)
router.get("/users", requireAuth, requireRole(["admin"]), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const page = Math.max(Number(req.query.page || 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  return res.json({ items, total, page, limit });
});

// ✅ Zmiana roli (admin only)
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { role } = req.body;

  const allowed = ["user", "mod", "admin"];
  if (!allowed.includes(role)) {
    return res.status(400).json({ message: "Nieprawidłowa rola" });
  }

  // (opcjonalnie) blokada żeby nie zdejmować sobie admina
  if (String(req.dbUser?._id) === String(req.params.id) && role !== "admin") {
    return res.status(400).json({ message: "Nie możesz odebrać sobie roli admin" });
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Nie znaleziono użytkownika" });
  return res.json(updated);
});

// ✅ Usuwanie usera z Mongo (admin only) — UWAGA: nie usuwa z Firebase!
router.delete("/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) return res.status(404).json({ message: "Nie znaleziono użytkownika" });
  return res.json({ ok: true });
});

// ✅ Lista profili (admin + mod)
router.get("/profiles", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const page = Math.max(Number(req.query.page || 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Profile.find()
      .select("name userId slug isVisible visibleUntil createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Profile.countDocuments(),
  ]);

  return res.json({ items, total, page, limit });
});

// ✅ toggle isVisible (admin + mod)
router.patch(
  "/profiles/:id/visible",
  requireAuth,
  requireRole(["admin", "mod"]),
  async (req, res) => {
    try {
      const { isVisible } = req.body;

      const updated = await Profile.findByIdAndUpdate(
        req.params.id,
        { $set: { isVisible: !!isVisible } },
        { new: true }
      ).lean();

      if (!updated) return res.status(404).json({ message: "Nie znaleziono profilu" });

      return res.json(updated);
    } catch (e) {
      return res.status(500).json({ message: "Błąd serwera", error: e.message });
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

  res.json({ items, total, page, limit });
});

// ✅ zamknij zgłoszenie (admin + mod)
router.patch("/reports/:id/close", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const { adminNote = "" } = req.body || {};
  const updated = await Report.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "closed", adminNote: String(adminNote).trim().slice(0, 400) } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
  res.json(updated);
});

// ✅ moderacja: usuń opinię z profilu (admin + mod)
router.delete("/reports/:id/remove-review", requireAuth, requireRole(["admin", "mod"]), async (req, res) => {
  const rep = await Report.findById(req.params.id).lean();
  if (!rep) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
  if (rep.type !== "review" || !rep.reviewId) return res.status(400).json({ message: "To nie jest zgłoszenie opinii." });

  const prof = await Profile.findOneAndUpdate(
    { userId: rep.profileUserId },
    { $pull: { ratedBy: { _id: rep.reviewId } } },
    { new: true }
  ).lean();

  // zamknij zgłoszenie
  await Report.findByIdAndUpdate(rep._id, { $set: { status: "closed", adminNote: "Usunięto opinię." } });

  res.json({ ok: true, profile: prof });
});

module.exports = router;