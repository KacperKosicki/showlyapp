// routes/staff.js
const express = require("express");
const router = express.Router();

const Staff = require("../models/Staff");
const Profile = require("../models/Profile");
const { getEffectivePlan, getEffectivePlanKey, getLimit, hasFeature } = require("../config/plans");

const requireAuth = require("../middleware/requireAuth");

const getAdminUids = () =>
  String(process.env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const isAdminUid = (uid) => getAdminUids().includes(String(uid));

async function assertOwnerOrAdminByProfileId(profileId, authUid) {
  const uid = String(authUid || "");
  if (!uid) return { ok: false, code: 401, message: "Brak autoryzacji" };

  const profile = await Profile.findById(profileId).select("userId billing").lean();
  if (!profile) return { ok: false, code: 404, message: "Profil nie istnieje" };

  if (isAdminUid(uid)) return { ok: true, isAdmin: true, isOwner: false, profile };

  const ownerUid = String(profile.userId || "");
  if (!ownerUid) return { ok: false, code: 403, message: "Profil bez właściciela" };

  if (ownerUid !== uid) return { ok: false, code: 403, message: "Brak uprawnień" };

  return { ok: true, isAdmin: false, isOwner: true, profile };
}

async function validateStaffCreateLimit(profileId, profile) {
  const planInfo = getEffectivePlan(profile);
  const currentPlan = getEffectivePlanKey(profile);

  if (!hasFeature(profile, "team")) {
    return {
      ok: false,
      code: 403,
      message: "Zespół i pracownicy są dostępni tylko w planie Premium.",
      errorCode: "FEATURE_TEAM_REQUIRED",
      limit: 0,
      current: 0,
      currentPlan,
      plan: planInfo,
    };
  }

  const maxStaff = getLimit(profile, "staff");
  const currentStaff = await Staff.countDocuments({ profileId });

  if (currentStaff >= maxStaff) {
    return {
      ok: false,
      code: 403,
      message: `Plan ${planInfo.label} pozwala dodać maksymalnie ${maxStaff} pracowników.`,
      errorCode: "PLAN_LIMIT_STAFF",
      limit: maxStaff,
      current: currentStaff,
      currentPlan,
      plan: planInfo,
    };
  }

  return {
    ok: true,
    limit: maxStaff,
    current: currentStaff,
    currentPlan,
    plan: planInfo,
  };
}

/**
 * GET /api/staff?profileId=
 * PUBLIC (np. do kalendarza)
 */
router.get("/", async (req, res) => {
  try {
    const { profileId } = req.query;

    const q = { ...(profileId ? { profileId } : {}) };

    const staff = await Staff.find(q).lean();
    return res.json(staff);
  } catch (e) {
    console.error("GET /staff error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * POST /api/staff
 * AUTH: owner profilu lub admin
 * body: { profileId, name, ... }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const profileId = req.body?.profileId;
    if (!profileId) {
      return res.status(400).json({ message: "Brak profileId" });
    }

    const perm = await assertOwnerOrAdminByProfileId(profileId, authUid);
    if (!perm.ok) {
      return res.status(perm.code).json({ message: perm.message });
    }

    const limit = await validateStaffCreateLimit(profileId, perm.profile);
    if (!limit.ok) {
      return res.status(limit.code).json({
        message: limit.message,
        errors: [
          {
            field: "staff",
            code: limit.errorCode,
            message: limit.message,
            limit: limit.limit,
            current: limit.current,
          },
        ],
        plan: {
          currentPlan: limit.currentPlan,
          label: limit.plan.label,
          limits: limit.plan.limits,
          features: limit.plan.features,
        },
      });
    }

    // Twardo ustawiamy profileId z body po walidacji uprawnień i limitu.
    const payload = { ...req.body, profileId };

    const s = await Staff.create(payload);
    return res.status(201).json(s);
  } catch (e) {
    console.error("POST /staff error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * PATCH /api/staff/:id
 * AUTH: owner profilu tego staffa lub admin
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const staffDoc = await Staff.findById(req.params.id).lean();
    if (!staffDoc) return res.status(404).json({ message: "Nie znaleziono pracownika" });

    const perm = await assertOwnerOrAdminByProfileId(staffDoc.profileId, authUid);
    if (!perm.ok) {
      return res.status(perm.code).json({ message: perm.message });
    }

    // 🔒 nie pozwalamy zmieniać profileId (żeby nie przepiąć pracownika na cudzy profil)
    const update = { ...req.body };
    delete update.profileId;

    const updated = await Staff.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.json(updated);
  } catch (e) {
    console.error("PATCH /staff/:id error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * DELETE /api/staff/:id
 * AUTH: owner profilu tego staffa lub admin
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const staffDoc = await Staff.findById(req.params.id).lean();
    if (!staffDoc) return res.status(404).json({ message: "Nie znaleziono pracownika" });

    const perm = await assertOwnerOrAdminByProfileId(staffDoc.profileId, authUid);
    if (!perm.ok) {
      return res.status(perm.code).json({ message: perm.message });
    }

    const deleted = await Staff.findByIdAndDelete(req.params.id);
    return res.json(deleted);
  } catch (e) {
    console.error("DELETE /staff/:id error", e);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;
