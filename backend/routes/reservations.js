const express = require("express");
const router = express.Router();

const Reservation = require("../models/Reservation");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Staff = require("../models/Staff");
const { sendPushToUserUid } = require("../utils/sendPushNotification");

const requireAuth = require("../middleware/requireAuth");

const {
  hasFeature,
  getPublicBilling,
} = require("../config/plans");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// === USTAWIENIA ===
const PENDING_MINUTES = Number(process.env.PENDING_MINUTES ?? 60);

// ✅ stała przerwa po usłudze
const SLOT_BREAK_MIN = 5;

// ✅ bufor tylko 0/5/10/15 (fallback: 0)
const normalizeBuffer = (v) => {
  const n = Number(v);
  return [0, 5, 10, 15].includes(n) ? n : 0;
};

// ✅ EFFECTIVE = 5 min przerwy + bufor z profilu (0/5/10/15)
const getEffectiveBufferMin = (profile) => {
  const profileBuf = normalizeBuffer(profile?.bookingBufferMin);
  return SLOT_BREAK_MIN + profileBuf;
};

// ✅ helpery usług
const findProfileService = (profile, serviceId) => {
  if (!profile || !Array.isArray(profile.services) || !serviceId) return null;
  return profile.services.find((s) => String(s._id) === String(serviceId)) || null;
};

const ensureServiceIsBookable = (profile, serviceId) => {
  if (!serviceId) {
    return { ok: true, service: null };
  }

  const service = findProfileService(profile, serviceId);

  if (!service) {
    return {
      ok: false,
      status: 404,
      message: "Wybrana usługa nie istnieje.",
    };
  }

  if (service.isActive === false) {
    return {
      ok: false,
      status: 400,
      message: "Ta usługa jest obecnie wyłączona i nie można jej zarezerwować.",
    };
  }

  return { ok: true, service };
};

// helpery
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// ⚠️ Uwaga: to jest UTC "na sztywno" (Z). Jeśli liczysz lokalnie, musisz to ujednolicić.
const toDateTime = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00.000Z`);

const MIN_CONFIRM_BEFORE_START_MIN = Number(
  process.env.MIN_CONFIRM_BEFORE_START_MIN ?? 60
);

function calculatePendingExpiresAt(startAt) {
  const now = new Date();

  const maxPendingDeadline = new Date(
    now.getTime() + PENDING_MINUTES * 60 * 1000
  );

  const beforeStartDeadline = new Date(
    startAt.getTime() - MIN_CONFIRM_BEFORE_START_MIN * 60 * 1000
  );

  const deadline =
    beforeStartDeadline.getTime() < maxPendingDeadline.getTime()
      ? beforeStartDeadline
      : maxPendingDeadline;

  // Jeżeli deadline już minął, to nie ma sensu tworzyć oczekującej rezerwacji.
  if (deadline.getTime() <= now.getTime()) {
    return null;
  }

  return deadline;
}

function calculateDayPendingExpiresAt(dateStr) {
  const now = new Date();

  const maxPendingDeadline = new Date(
    now.getTime() + PENDING_MINUTES * 60 * 1000
  );

  // Deadline dla rezerwacji całodniowej: dzień przed terminem, godz. 20:00.
  // Trzymamy się UTC, bo cały ten plik używa dat z "Z".
  const beforeDayDeadline = new Date(`${dateStr}T20:00:00.000Z`);
  beforeDayDeadline.setUTCDate(beforeDayDeadline.getUTCDate() - 1);

  const deadline =
    beforeDayDeadline.getTime() < maxPendingDeadline.getTime()
      ? beforeDayDeadline
      : maxPendingDeadline;

  if (deadline.getTime() <= now.getTime()) {
    return null;
  }

  return deadline;
}

const ALIVE_STATUSES = ["zaakceptowana", "oczekująca", "tymczasowa"];

const getReservationPlanAccess = (profile) => {
  const billingPublic = getPublicBilling(profile);

  const canUseBooking = hasFeature(profile, "booking", {
    allowPastDue: true,
  });

  const canUseRequestBlocking = hasFeature(profile, "requestBlocking", {
    allowPastDue: true,
  });

  const canUseTeam = hasFeature(profile, "team", {
    allowPastDue: true,
  });

  const rawBookingMode = String(profile?.bookingMode || "request-open").toLowerCase();

  const bookingMode =
    rawBookingMode === "calendar" && canUseBooking
      ? "calendar"
      : rawBookingMode === "request-blocking" && canUseRequestBlocking
        ? "request-blocking"
        : rawBookingMode === "request-open"
          ? "request-open"
          : "request-open";

  const team =
    canUseTeam && profile?.team?.enabled === true
      ? profile.team
      : {
        enabled: false,
        assignmentMode: "user-pick",
      };

  const bookingBufferMin =
    bookingMode === "calendar"
      ? normalizeBuffer(profile?.bookingBufferMin)
      : 0;

  const autoAcceptReservations =
    canUseBooking && profile?.autoAcceptReservations === true;

  return {
    billingPublic,
    bookingMode,
    team,
    bookingBufferMin,
    canUseBooking,
    canUseRequestBlocking,
    canUseTeam,
    autoAcceptReservations,
  };
};

// ⬇️ wspólny warunek czasowy z buforem (w minutach)
function mongoTimeCondition(startAt, endAt, bufferMin = SLOT_BREAK_MIN) {
  const bufMs = (Number(bufferMin) || 0) * 60000;
  return {
    startAt: { $lt: new Date(endAt.getTime() + bufMs) },
    endAt: { $gt: new Date(startAt.getTime() - bufMs) },
  };
}

// ✅ admin helper (czyta rolę z DB — bezpieczne i proste)
async function isAdminUid(uid) {
  try {
    const u = await User.findOne({ firebaseUid: uid }).select("role").lean();
    return String(u?.role || "").toLowerCase() === "admin";
  } catch {
    return false;
  }
}

// wybór osoby dla auto-assign (z buforem, capacity i preferencją faktycznie wolnych)
async function pickAvailableStaffForProfile({
  providerProfileId,
  serviceId,
  startAt,
  endAt,
  excludeIds = [],
  bufferMin = SLOT_BREAK_MIN,
}) {
  const all = await Staff.find({ profileId: providerProfileId, active: true }).lean();

  const candidates = all.filter(
    (s) =>
      !excludeIds.some((ex) => String(ex) === String(s._id)) &&
      (s.serviceIds || []).some((id) => String(id) === String(serviceId))
  );

  if (!candidates.length) return null;

  const results = await Promise.all(
    candidates.map(async (s) => {
      const capacity = Math.max(1, Number(s.capacity) || 1);

      const overlapCond = {
        providerProfileId,
        staffId: s._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        ...mongoTimeCondition(startAt, endAt, bufferMin),
      };

      const overlapCount = await Reservation.countDocuments(overlapCond);
      const overlapping =
        overlapCount > 0
          ? await Reservation.find(overlapCond, { startAt: 1, endAt: 1 }).lean()
          : [];

      const loadNow = overlapping.length;

      const lastBefore = await Reservation.findOne({
        providerProfileId,
        staffId: s._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        endAt: {
          $lte: new Date(startAt.getTime() + (Number(bufferMin) || 0) * 60000),
        },
      })
        .sort({ endAt: -1 })
        .select({ endAt: 1 })
        .lean();

      return {
        staff: s,
        capacity,
        overlapCount,
        loadNow,
        lastEndBefore: lastBefore?.endAt ? lastBefore.endAt.getTime() : 0,
      };
    })
  );

  const feasible = results.filter((r) => r.loadNow < r.capacity);
  if (!feasible.length) return null;

  const trulyFree = feasible.filter((r) => r.overlapCount === 0);
  const pool = trulyFree.length ? trulyFree : feasible;

  pool.sort((a, b) => {
    if (a.loadNow !== b.loadNow) return a.loadNow - b.loadNow;
    if (a.lastEndBefore !== b.lastEndBefore) return a.lastEndBefore - b.lastEndBefore;
    return String(a.staff._id).localeCompare(String(b.staff._id));
  });

  return pool[0].staff || null;
}

// zamykanie przeterminowanych pendingów
async function closeExpiredPending() {
  const now = new Date();
  await Reservation.updateMany(
    { status: "oczekująca", pendingExpiresAt: { $lte: now } },
    {
      $set: {
        status: "anulowana",
        closedAt: now,
        closedBy: "system",
        closedReason: "expired",
        clientSeen: false,
        providerSeen: false,
      },
    }
  );
}

/**
 * =====================
 * POST /api/reservations – godzinowa (online klient)
 * AUTH: klient musi być userId
 * =====================
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const {
      userId,
      providerUserId,
      providerProfileId,
      date,
      fromTime,
      toTime,
      duration,
      description,
      serviceId,
      staffId: staffIdFromClient,
    } = req.body;

    // 🔒 klient nie może podszyć się pod innego usera
    if (!userId || String(userId) !== String(authUid)) {
      return res.status(403).json({ message: "Brak uprawnień (userId != zalogowany użytkownik)" });
    }

    if (!providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: "Brakuje wymaganych pól" });
    }

    const startAt = toDateTime(date, fromTime);
    const endAt = toDateTime(date, toTime);

    const [user, provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: userId }),
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);

    if (!profile) return res.status(404).json({ message: "Profil usługodawcy nie istnieje" });

    const planAccess = getReservationPlanAccess(profile);

    if (planAccess.bookingMode !== "calendar") {
      return res.status(403).json({
        message:
          "Rezerwacje godzinowe są dostępne tylko dla profili z aktywnym planem Premium i trybem kalendarza.",
      });
    }

    // 🔒 profil musi należeć do providerUserId
    if (String(profile.userId) !== String(providerUserId)) {
      return res.status(403).json({ message: "Nieprawidłowy providerProfileId dla tego providerUserId" });
    }

    const effectiveBufferMin = SLOT_BREAK_MIN + planAccess.bookingBufferMin;

    const serviceCheck = ensureServiceIsBookable(profile, serviceId);
    if (!serviceCheck.ok) {
      return res.status(serviceCheck.status).json({ message: serviceCheck.message });
    }

    const serviceDoc = serviceCheck.service;
    const serviceName = serviceDoc?.name || null;

    const isCalendarTeam =
      planAccess.bookingMode === "calendar" && planAccess.team?.enabled === true;

    let staffDocFinal = null;
    let staffAutoAssigned = false;

    if (isCalendarTeam) {
      const mode = planAccess.team.assignmentMode; // 'user-pick' | 'auto-assign'

      if (mode === "user-pick") {
        if (!staffIdFromClient) return res.status(400).json({ message: "Wybierz pracownika" });

        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: "Nieprawidłowy pracownik" });

        const canDoService = (staffDoc.serviceIds || []).some((id) => String(id) === String(serviceId));
        if (!canDoService) return res.status(400).json({ message: "Wybrana osoba nie wykonuje tej usługi" });

        staffDocFinal = staffDoc;
      }

      if (mode === "auto-assign" && !staffIdFromClient) {
        const picked = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          bufferMin: effectiveBufferMin,
        });
        if (!picked) return res.status(409).json({ message: "Brak dostępnego pracownika" });
        staffDocFinal = picked;
        staffAutoAssigned = true;
      }

      if (mode === "auto-assign" && staffIdFromClient && !staffDocFinal) {
        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: "Nieprawidłowy pracownik" });

        const canDoService = (staffDoc.serviceIds || []).some((id) => String(id) === String(serviceId));
        if (!canDoService) return res.status(400).json({ message: "Wybrana osoba nie wykonuje tej usługi" });

        staffDocFinal = staffDoc;
      }
    }

    // 🔒 KOLIZJE
    if (isCalendarTeam && staffDocFinal?._id) {
      let overlaps = await Reservation.countDocuments({
        providerProfileId,
        staffId: staffDocFinal._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        ...mongoTimeCondition(startAt, endAt, effectiveBufferMin),
      });

      if (overlaps >= (staffDocFinal.capacity ?? 1) && staffAutoAssigned) {
        const retryPick = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          excludeIds: [staffDocFinal._id],
          bufferMin: effectiveBufferMin,
        });

        if (retryPick) {
          staffDocFinal = retryPick;
          overlaps = await Reservation.countDocuments({
            providerProfileId,
            staffId: retryPick._id,
            dateOnly: false,
            status: { $in: ALIVE_STATUSES },
            ...mongoTimeCondition(startAt, endAt, effectiveBufferMin),
          });
        }
      }

      if (overlaps >= (staffDocFinal.capacity ?? 1)) {
        return res.status(409).json({ message: "Wybrany slot dla tej osoby jest zajęty." });
      }
    } else {
      const now = new Date();
      const existing = await Reservation.find({
        providerUserId,
        date,
        status: { $in: ALIVE_STATUSES },
        $or: [
          { status: "zaakceptowana" },
          { status: "oczekująca", pendingExpiresAt: { $gt: now } },
          { status: "tymczasowa", holdExpiresAt: { $gt: now } },
        ],
      }).lean();

      const reqStart = toMin(fromTime);
      const reqEnd = toMin(toTime) + effectiveBufferMin;

      const hasCollision = existing.some((d) => {
        const s = toMin(d.fromTime);
        const e = toMin(d.toTime) + effectiveBufferMin;
        return overlap(reqStart, reqEnd, s, e);
      });

      if (hasCollision) {
        return res.status(409).json({ message: "Wybrany slot jest zajęty lub niedostępny." });
      }
    }

    const shouldAutoAccept = planAccess.autoAcceptReservations === true;

    const pendingExpiresAt = shouldAutoAccept
      ? null
      : calculatePendingExpiresAt(startAt);

    if (!shouldAutoAccept && !pendingExpiresAt) {
      return res.status(400).json({
        message:
          "Ten termin jest zbyt blisko rozpoczęcia, aby wysłać rezerwację do ręcznego potwierdzenia. Wybierz późniejszą godzinę.",
      });
    }

    const reservationStatus = shouldAutoAccept ? "zaakceptowana" : "oczekująca";

    const newReservation = await Reservation.create({
      offline: false,
      userId,
      userName: user?.name || "Klient",

      providerUserId,
      providerName: provider?.name || "Usługodawca",

      providerProfileId,
      providerProfileName: profile?.name || "Profil",
      providerProfileRole: profile?.role || "Brak roli",

      staffId: staffDocFinal?._id || null,
      staffName: staffDocFinal?.name || null,
      staffAutoAssigned,

      date,
      dateOnly: false,
      fromTime,
      toTime,
      startAt,
      endAt,

      duration,
      serviceId: serviceId || null,
      serviceName: serviceName || null,

      description,
      status: reservationStatus,
      pendingExpiresAt,
      holdExpiresAt: null,

      closedAt: null,
      closedBy: null,
      closedReason: null,
      clientSeen: false,
      providerSeen: false,
    });

    if (shouldAutoAccept && Array.isArray(profile.availableDates)) {
      profile.availableDates = profile.availableDates.filter(
        (slot) =>
          !(
            slot.date === date &&
            slot.fromTime === fromTime &&
            slot.toTime === toTime
          )
      );

      await profile.save();
    }

    await sendPushToUserUid(providerUserId, {
      title: shouldAutoAccept ? "Nowa potwierdzona rezerwacja" : "Nowa rezerwacja",
      body: shouldAutoAccept
        ? `${user?.name || "Klient"} zarezerwował termin ${date} o ${fromTime}. Rezerwacja została automatycznie zaakceptowana.`
        : `${user?.name || "Klient"} wysłał rezerwację na ${date} o ${fromTime}`,
      url: `${FRONTEND_URL}/rezerwacje`,
    });

    return res.status(201).json({ message: "Rezerwacja utworzona", reservation: newReservation });
  } catch (err) {
    console.error("❌ POST /reservations error:", err);
    return res.status(500).json({ message: "Błąd serwera", error: err?.message || err });
  }
});

/**
 * =====================
 * POST /api/reservations/offline – godzinowa (provider ręcznie)
 * AUTH: provider musi być providerUserId
 * =====================
 */
router.post("/offline", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const {
      providerUserId,
      providerProfileId,
      date,
      fromTime,
      toTime,
      description,
      serviceId,
      serviceName: serviceNameFromClient,
      staffId: staffIdFromProvider,
      offlineClientName,
      offlineClientPhone,
      offlineNote,
    } = req.body;

    if (!providerUserId || String(providerUserId) !== String(authUid)) {
      return res.status(403).json({ message: "Brak uprawnień (providerUserId != zalogowany użytkownik)" });
    }

    if (!providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({
        message: "Brakuje wymaganych pól (providerProfileId, date, fromTime, toTime).",
      });
    }

    if (!offlineClientName || !String(offlineClientName).trim()) {
      return res.status(400).json({ message: "Podaj offlineClientName (np. imię/nazwa klienta)." });
    }

    const startAt = toDateTime(date, fromTime);
    const endAt = toDateTime(date, toTime);

    const [provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);

    if (!profile) return res.status(404).json({ message: "Profil usługodawcy nie istnieje" });

    // 🔒 profil musi należeć do providerUserId
    if (String(profile.userId) !== String(providerUserId)) {
      return res.status(403).json({ message: "Nieprawidłowy providerProfileId dla tego providerUserId" });
    }

    const planAccess = getReservationPlanAccess(profile);

    if (planAccess.bookingMode !== "calendar") {
      return res.status(403).json({
        message:
          "Dodawanie rezerwacji godzinowych offline jest dostępne tylko w aktywnym planie Premium z trybem kalendarza.",
      });
    }

    const effectiveBufferMin = SLOT_BREAK_MIN + planAccess.bookingBufferMin;

    const isCalendarTeam =
      planAccess.bookingMode === "calendar" && planAccess.team?.enabled === true;

    const serviceCheck = ensureServiceIsBookable(profile, serviceId);
    if (!serviceCheck.ok) {
      return res.status(serviceCheck.status).json({ message: serviceCheck.message });
    }

    const serviceDoc = serviceCheck.service;
    const serviceName = serviceNameFromClient || serviceDoc?.name || null;

    let staffDocFinal = null;
    let staffAutoAssigned = false;

    if (isCalendarTeam) {
      const mode = planAccess.team.assignmentMode; // 'user-pick' | 'auto-assign'
      const preferredStaffId = staffIdFromProvider || null;

      if (mode === "user-pick" || preferredStaffId) {
        if (!preferredStaffId) return res.status(400).json({ message: "Wybierz pracownika (staffId)." });

        const staffDoc = await Staff.findOne({
          _id: preferredStaffId,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: "Nieprawidłowy pracownik" });

        if (serviceId) {
          const canDoService = (staffDoc.serviceIds || []).some((id) => String(id) === String(serviceId));
          if (!canDoService) return res.status(400).json({ message: "Wybrana osoba nie wykonuje tej usługi" });
        }

        staffDocFinal = staffDoc;
      }

      if (mode === "auto-assign" && !staffDocFinal) {
        if (!serviceId) return res.status(400).json({ message: "Dla auto-assign wymagany serviceId." });

        const picked = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          bufferMin: effectiveBufferMin,
        });
        if (!picked) return res.status(409).json({ message: "Brak dostępnego pracownika" });

        staffDocFinal = picked;
        staffAutoAssigned = true;
      }
    }

    // 🔒 KOLIZJE (offline też blokuje slot)
    if (isCalendarTeam && staffDocFinal?._id) {
      let overlaps = await Reservation.countDocuments({
        providerProfileId,
        staffId: staffDocFinal._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        ...mongoTimeCondition(startAt, endAt, effectiveBufferMin),
      });

      if (overlaps >= (staffDocFinal.capacity ?? 1) && staffAutoAssigned) {
        const retryPick = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          excludeIds: [staffDocFinal._id],
          bufferMin: effectiveBufferMin,
        });

        if (retryPick) {
          staffDocFinal = retryPick;
          overlaps = await Reservation.countDocuments({
            providerProfileId,
            staffId: retryPick._id,
            dateOnly: false,
            status: { $in: ALIVE_STATUSES },
            ...mongoTimeCondition(startAt, endAt, effectiveBufferMin),
          });
        }
      }

      if (overlaps >= (staffDocFinal.capacity ?? 1)) {
        return res.status(409).json({ message: "Wybrany slot dla tej osoby jest zajęty." });
      }
    } else {
      const existing = await Reservation.find({
        providerUserId,
        date,
        status: { $in: ALIVE_STATUSES },
      }).lean();

      const reqStart = toMin(fromTime);
      const reqEnd = toMin(toTime) + effectiveBufferMin;

      const hasCollision = existing.some((d) => {
        const s = toMin(d.fromTime);
        const e = toMin(d.toTime) + effectiveBufferMin;
        return overlap(reqStart, reqEnd, s, e);
      });

      if (hasCollision) {
        return res.status(409).json({ message: "Wybrany slot jest zajęty lub niedostępny." });
      }
    }

    const created = await Reservation.create({
      offline: true,
      offlineClientName: String(offlineClientName).trim(),
      offlineClientPhone: offlineClientPhone ? String(offlineClientPhone).trim() : null,
      offlineNote: offlineNote ? String(offlineNote).trim() : null,

      userId: null,
      userName: String(offlineClientName).trim(),

      providerUserId,
      providerName: provider?.name || "Usługodawca",

      providerProfileId,
      providerProfileName: profile?.name || "Profil",
      providerProfileRole: profile?.role || "Brak roli",

      staffId: staffDocFinal?._id || null,
      staffName: staffDocFinal?.name || null,
      staffAutoAssigned,

      date,
      dateOnly: false,
      fromTime,
      toTime,
      startAt,
      endAt,

      description: (description || "").trim(),
      serviceId: serviceId || null,
      serviceName: serviceName || null,

      status: "zaakceptowana",
      pendingExpiresAt: null,
      holdExpiresAt: null,

      closedAt: null,
      closedBy: null,
      closedReason: null,

      providerSeen: true,
      clientSeen: true,
    });

    return res.status(201).json({ message: "Offline rezerwacja utworzona", reservation: created });
  } catch (err) {
    console.error("❌ POST /reservations/offline error:", err);
    return res.status(500).json({ message: "Błąd serwera", error: err?.message || err });
  }
});

/**
 * =====================
 * POST /api/reservations/day – rezerwacja całego dnia (online klient)
 * AUTH: klient musi być userId
 * =====================
 */
router.post("/day", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const {
      userId,
      userName,
      providerUserId,
      providerName,
      providerProfileId,
      providerProfileName,
      providerProfileRole,
      date,
      description,
      serviceId,
      serviceName: svcNameFromClient,
    } = req.body;

    if (!userId || String(userId) !== String(authUid)) {
      return res.status(403).json({ message: "Brak uprawnień (userId != zalogowany użytkownik)" });
    }

    if (!providerUserId || !providerProfileId || !date) {
      return res.status(400).json({ message: "Brak wymaganych pól." });
    }

    // 🔒 weryfikacja, że providerProfileId należy do providerUserId
    const providerProfile = await Profile.findById(providerProfileId).lean();
    if (!providerProfile) return res.status(404).json({ message: "Profil usługodawcy nie istnieje" });
    if (String(providerProfile.userId) !== String(providerUserId)) {
      return res.status(403).json({ message: "Nieprawidłowy providerProfileId dla tego providerUserId" });
    }

    const planAccess = getReservationPlanAccess(providerProfile);

    if (planAccess.bookingMode !== "request-blocking") {
      return res.status(403).json({
        message:
          "Rezerwacje całodniowe są dostępne tylko dla profili z aktywnym planem Premium i trybem blokowania dni.",
      });
    }

    const profile = await Profile.findOne(
      { userId: providerUserId },
      { blockedDays: 1, services: 1 }
    ).lean();

    if (profile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: "Ten dzień jest zablokowany przez usługodawcę." });
    }

    const existsAccepted = await Reservation.findOne({
      providerUserId,
      date,
      dateOnly: true,
      status: "zaakceptowana",
    }).lean();
    if (existsAccepted) return res.status(409).json({ message: "Ten dzień jest już zajęty." });

    const now = new Date();
    const dupPending = await Reservation.findOne({
      userId,
      providerUserId,
      date,
      dateOnly: true,
      status: "oczekująca",
      pendingExpiresAt: { $gt: now },
    }).lean();
    if (dupPending) return res.status(409).json({ message: "Masz już oczekującą prośbę na ten dzień." });

    const serviceCheck = ensureServiceIsBookable(profile, serviceId);
    if (!serviceCheck.ok) {
      return res.status(serviceCheck.status).json({ message: serviceCheck.message });
    }

    const serviceDoc = serviceCheck.service;

    let serviceName = svcNameFromClient || null;
    if (!serviceName && serviceDoc) {
      serviceName = serviceDoc.name;
    }

    const shouldAutoAccept = planAccess.autoAcceptReservations === true;

    const pendingExpiresAt = shouldAutoAccept
      ? null
      : calculateDayPendingExpiresAt(date);

    if (!shouldAutoAccept && !pendingExpiresAt) {
      return res.status(400).json({
        message:
          "Ten dzień jest zbyt blisko terminu, aby wysłać rezerwację do ręcznego potwierdzenia. Wybierz późniejszą datę albo skontaktuj się z usługodawcą.",
      });
    }

    const reservationStatus = shouldAutoAccept ? "zaakceptowana" : "oczekująca";

    const created = await Reservation.create({
      offline: false,

      userId,
      userName,

      providerUserId,
      providerName,

      providerProfileId,
      providerProfileName,
      providerProfileRole,

      date,
      dateOnly: true,
      fromTime: "00:00",
      toTime: "23:59",
      description: (description || "").trim(),

      status: reservationStatus,
      pendingExpiresAt,

      serviceId: serviceId || null,
      serviceName: serviceName || null,

      closedAt: null,
      closedBy: null,
      closedReason: null,
      clientSeen: false,
      providerSeen: false,
    });

    await sendPushToUserUid(providerUserId, {
      title: shouldAutoAccept ? "Nowa potwierdzona rezerwacja" : "Nowa rezerwacja",
      body: shouldAutoAccept
        ? `${userName || "Klient"} zarezerwował dzień ${date}. Rezerwacja została automatycznie zaakceptowana.`
        : `${userName || "Klient"} wysłał rezerwację na dzień ${date}`,
      url: `${FRONTEND_URL}/rezerwacje`,
    });

    return res.json(created);
  } catch (e) {
    console.error("POST /reservations/day error", e);
    return res.status(500).json({ message: "Nie udało się utworzyć rezerwacji dnia." });
  }
});

/**
 * =====================
 * POST /api/reservations/offline/day – day offline (provider)
 * AUTH: provider musi być providerUserId
 * =====================
 */
router.post("/offline/day", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;

    const {
      providerUserId,
      providerProfileId,
      date,
      description,
      serviceId,
      serviceName: svcNameFromClient,
      offlineClientName,
      offlineClientPhone,
      offlineNote,
    } = req.body;

    if (!providerUserId || String(providerUserId) !== String(authUid)) {
      return res.status(403).json({ message: "Brak uprawnień (providerUserId != zalogowany użytkownik)" });
    }

    if (!providerProfileId || !date) {
      return res.status(400).json({
        message: "Brakuje wymaganych pól (providerProfileId, date).",
      });
    }

    if (!offlineClientName || !String(offlineClientName).trim()) {
      return res.status(400).json({ message: "Podaj offlineClientName (np. imię/nazwa klienta)." });
    }

    const [provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);
    if (!profile) return res.status(404).json({ message: "Profil usługodawcy nie istnieje" });

    // 🔒 profil musi należeć do providerUserId
    if (String(profile.userId) !== String(providerUserId)) {
      return res.status(403).json({ message: "Nieprawidłowy providerProfileId dla tego providerUserId" });
    }

    const planAccess = getReservationPlanAccess(profile);

    if (planAccess.bookingMode !== "request-blocking") {
      return res.status(403).json({
        message:
          "Dodawanie blokad całodniowych offline jest dostępne tylko w aktywnym planie Premium i trybie blokowania dni.",
      });
    }

    const fullProfile = await Profile.findOne(
      { userId: providerUserId },
      { blockedDays: 1, services: 1 }
    ).lean();

    if (fullProfile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: "Ten dzień jest zablokowany przez usługodawcę." });
    }

    const existsAccepted = await Reservation.findOne({
      providerUserId,
      date,
      dateOnly: true,
      status: "zaakceptowana",
    }).lean();
    if (existsAccepted) return res.status(409).json({ message: "Ten dzień jest już zajęty." });

    const serviceCheck = ensureServiceIsBookable(fullProfile, serviceId);
    if (!serviceCheck.ok) {
      return res.status(serviceCheck.status).json({ message: serviceCheck.message });
    }

    const serviceDoc = serviceCheck.service;

    let serviceName = svcNameFromClient || null;
    if (!serviceName && serviceDoc) {
      serviceName = serviceDoc.name;
    }

    const created = await Reservation.create({
      offline: true,
      offlineClientName: String(offlineClientName).trim(),
      offlineClientPhone: offlineClientPhone ? String(offlineClientPhone).trim() : null,
      offlineNote: offlineNote ? String(offlineNote).trim() : null,

      userId: null,
      userName: String(offlineClientName).trim(),

      providerUserId,
      providerName: provider?.name || "Usługodawca",

      providerProfileId,
      providerProfileName: profile?.name || "Profil",
      providerProfileRole: profile?.role || "Brak roli",

      date,
      dateOnly: true,
      fromTime: "00:00",
      toTime: "23:59",
      description: (description || "").trim(),

      status: "zaakceptowana",
      pendingExpiresAt: null,

      serviceId: serviceId || null,
      serviceName: serviceName || null,

      closedAt: null,
      closedBy: null,
      closedReason: null,

      providerSeen: true,
      clientSeen: true,
    });

    return res.status(201).json({ message: "Offline day utworzony", reservation: created });
  } catch (e) {
    console.error("POST /reservations/offline/day error:", e);
    return res.status(500).json({ message: "Nie udało się utworzyć offline day." });
  }
});

/**
 * =====================
 * GET /api/reservations/by-user/:uid
 * AUTH: uid w URL musi być zalogowanym userem (lub admin)
 * =====================
 */
router.get("/by-user/:uid", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;
    const uid = req.params.uid;

    const admin = await isAdminUid(authUid);
    if (String(uid) !== String(authUid) && !admin) {
      return res.status(403).json({ message: "Brak uprawnień" });
    }

    await closeExpiredPending();
    const now = new Date();

    const reservations = await Reservation.find({
      userId: uid,
      $or: [
        { status: "zaakceptowana" },
        { status: "oczekująca", pendingExpiresAt: { $gt: now } },
        { status: { $in: ["anulowana", "odrzucona"] }, clientSeen: false },
      ],
    }).sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (err) {
    console.error("❌ GET /reservations/by-user error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * =====================
 * GET /api/reservations/by-provider/:uid
 * AUTH: uid w URL musi być zalogowanym providerem (lub admin)
 * =====================
 */
router.get("/by-provider/:uid", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;
    const uid = req.params.uid;

    const admin = await isAdminUid(authUid);
    if (String(uid) !== String(authUid) && !admin) {
      return res.status(403).json({ message: "Brak uprawnień" });
    }

    await closeExpiredPending();
    const now = new Date();

    const reservations = await Reservation.find({
      providerUserId: uid,
      $or: [
        { status: "zaakceptowana" },
        { status: "oczekująca", pendingExpiresAt: { $gt: now } },
        { status: { $in: ["anulowana", "odrzucona"] }, providerSeen: false },
      ],
    }).sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (err) {
    console.error("❌ GET /reservations/by-provider error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * =====================
 * ✅ NOWE / ZALECANE DO KALENDARZA
 * GET /api/reservations/provider-busy/:providerUid
 * AUTH: dowolny zalogowany – zwraca TYLKO zajętość (bez danych klienta)
 * =====================
 */
router.get("/provider-busy/:providerUid", requireAuth, async (req, res) => {
  try {
    const { providerUid } = req.params;

    await closeExpiredPending();
    const now = new Date();

    const busy = await Reservation.find(
      {
        providerUserId: providerUid,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        $or: [
          { status: "zaakceptowana" },
          { status: "oczekująca", pendingExpiresAt: { $gt: now } },
          { status: "tymczasowa", holdExpiresAt: { $gt: now } },
        ],
      },
      {
        _id: 1,
        date: 1,
        fromTime: 1,
        toTime: 1,
        status: 1,
        staffId: 1,
        dateOnly: 1,
      }
    )
      .sort({ date: 1, fromTime: 1 })
      .lean();

    return res.json(busy || []);
  } catch (err) {
    console.error("❌ GET /reservations/provider-busy error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * =====================
 * GET /api/reservations/busy/:providerUid
 * AUTH: dowolny zalogowany – zwraca tylko "zajętość"
 * =====================
 */
router.get("/busy/:providerUid", requireAuth, async (req, res) => {
  try {
    const { providerUid } = req.params;

    await closeExpiredPending();
    const now = new Date();

    const busy = await Reservation.find(
      {
        providerUserId: providerUid,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        $or: [
          { status: "zaakceptowana" },
          { status: "oczekująca", pendingExpiresAt: { $gt: now } },
          { status: "tymczasowa", holdExpiresAt: { $gt: now } },
        ],
      },
      {
        _id: 1,
        date: 1,
        fromTime: 1,
        toTime: 1,
        status: 1,
        staffId: 1,
        dateOnly: 1,
      }
    )
      .sort({ date: 1, fromTime: 1 })
      .lean();

    return res.json(busy || []);
  } catch (err) {
    console.error("❌ GET /reservations/busy error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * =====================
 * GET /api/reservations/unavailable-days/:providerUid
 * PUBLIC (dla kalendarza)
 * =====================
 */
router.get("/unavailable-days/:providerUid", async (req, res) => {
  try {
    const { providerUid } = req.params;

    const profile = await Profile.findOne(
      { userId: providerUid },
      {
        blockedDays: 1,
        bookingMode: 1,
        billing: 1,
      }
    ).lean();

    const planAccess = profile ? getReservationPlanAccess(profile) : null;

    const canShowBlockedDays =
      planAccess?.bookingMode === "request-blocking";

    const blocked =
      canShowBlockedDays && Array.isArray(profile?.blockedDays)
        ? profile.blockedDays
        : [];

    const takenDocs = await Reservation.find(
      { providerUserId: providerUid, dateOnly: true, status: "zaakceptowana" },
      { date: 1, _id: 0 }
    ).lean();

    const taken = canShowBlockedDays ? takenDocs.map((d) => d.date) : [];

    const all = Array.from(new Set([...blocked, ...taken]));

    return res.json(all);
  } catch (e) {
    console.error("GET /reservations/unavailable-days error", e);
    return res.status(500).json({ message: "Błąd pobierania dni niedostępnych" });
  }
});

/**
 * =====================
 * PATCH /api/reservations/:id/client-note
 * Klient może dodać jedną wiadomość do swojej rezerwacji
 * =====================
 */
router.patch("/:id/client-note", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;
    const { id } = req.params;
    const { message } = req.body;

    const text = String(message || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Wiadomość nie może być pusta.",
      });
    }

    if (text.length < 5) {
      return res.status(400).json({
        message: "Wiadomość musi mieć minimum 5 znaków.",
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        message: "Wiadomość może mieć maksymalnie 500 znaków.",
      });
    }

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        message: "Rezerwacja nie istnieje.",
      });
    }

    if (!reservation.userId || String(reservation.userId) !== String(authUid)) {
      return res.status(403).json({
        message: "Możesz dopisać informację tylko do własnej rezerwacji.",
      });
    }

    if (["anulowana", "odrzucona"].includes(reservation.status)) {
      return res.status(400).json({
        message: "Nie można dopisać informacji do zamkniętej rezerwacji.",
      });
    }

    if (reservation.clientNote?.message) {
      return res.status(400).json({
        message: "Do tej rezerwacji dodano już wiadomość. Możesz dodać tylko jedną informację.",
      });
    }

    reservation.clientNote = {
      message: text,
      createdAt: new Date(),
    };

    reservation.providerSeen = false;

    await reservation.save();

    await sendPushToUserUid(reservation.providerUserId, {
      title: "Nowa informacja do rezerwacji",
      body: `${reservation.userName || "Klient"} dopisał/a informację do rezerwacji.`,
      url: `${FRONTEND_URL}/rezerwacje`,
    });

    return res.json({
      message: "Dodano informację do rezerwacji.",
      reservation,
    });
  } catch (err) {
    console.error("PATCH /reservations/:id/client-note error:", err);
    return res.status(500).json({
      message: "Błąd serwera",
    });
  }
});

/**
 * =====================
 * PATCH /api/reservations/:id/cancel-by-client
 * Klient anuluje swoją rezerwację z powodem
 * =====================
 */
router.patch("/:id/cancel-by-client", requireAuth, async (req, res) => {
  try {
    const authUid = req.auth.uid;
    const { id } = req.params;
    const { reason } = req.body;

    const text = String(reason || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Podaj powód anulowania rezerwacji." });
    }

    if (text.length > 500) {
      return res.status(400).json({ message: "Powód może mieć maksymalnie 500 znaków." });
    }

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({ message: "Rezerwacja nie istnieje." });
    }

    if (!reservation.userId || String(reservation.userId) !== String(authUid)) {
      return res.status(403).json({ message: "Możesz anulować tylko własną rezerwację." });
    }

    if (["anulowana", "odrzucona"].includes(reservation.status)) {
      return res.status(400).json({
        message: "Ta rezerwacja jest już zamknięta.",
      });
    }

    const now = new Date();

    reservation.status = "anulowana";
    reservation.closedAt = now;
    reservation.closedBy = "client";
    reservation.closedReason = "cancelled";
    reservation.cancelledBy = "client";
    reservation.cancellationReason = text;

    reservation.pendingExpiresAt = null;
    reservation.holdExpiresAt = null;

    reservation.clientSeen = true;
    reservation.providerSeen = false;

    await reservation.save();

    await sendPushToUserUid(reservation.providerUserId, {
      title: "Rezerwacja anulowana",
      body: `${reservation.userName || "Klient"} anulował/a rezerwację. Powód: ${text}`,
      url: `${FRONTEND_URL}/rezerwacje`,
    });

    return res.json({
      message: "Rezerwacja została anulowana.",
      reservation,
    });
  } catch (err) {
    console.error("PATCH /reservations/:id/cancel-by-client error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * =====================
 * PATCH /api/reservations/:id/status
 * AUTH:
 *  - anulowana -> klient (authUid === reservation.userId)
 *  - odrzucona/zaakceptowana -> provider (authUid === reservation.providerUserId)
 * =====================
 */
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const authUid = req.auth.uid;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send("Reservation not found");

    const now = new Date();

    if (status === "anulowana") {
      if (!reservation.userId || String(reservation.userId) !== String(authUid)) {
        return res.status(403).json({ message: "Tylko klient może anulować tę rezerwację" });
      }

      reservation.status = "anulowana";
      reservation.closedAt = now;
      reservation.closedBy = "client";
      reservation.closedReason = "cancelled";
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = true;
      reservation.providerSeen = false;

      await reservation.save();

      await sendPushToUserUid(reservation.providerUserId, {
        title: "Rezerwacja anulowana",
        body: `${reservation.userName || "Klient"} anulował/a rezerwację ${reservation.date}${reservation.dateOnly ? "" : ` o ${reservation.fromTime}`}`,
        url: `${FRONTEND_URL}/rezerwacje`,
      });

      return res.send("Reservation closed by client");
    }

    if (status === "odrzucona") {
      if (String(reservation.providerUserId) !== String(authUid)) {
        return res.status(403).json({ message: "Tylko usługodawca może odrzucić tę rezerwację" });
      }

      reservation.status = "odrzucona";
      reservation.closedAt = now;
      reservation.closedBy = "provider";
      reservation.closedReason = "rejected";
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = false;
      reservation.providerSeen = true;

      await reservation.save();

      if (reservation.userId) {
        await sendPushToUserUid(reservation.userId, {
          title: "Rezerwacja odrzucona",
          body: `Twoja rezerwacja z dnia ${reservation.date}${reservation.dateOnly ? "" : ` o ${reservation.fromTime}`} została odrzucona`,
          url: `${FRONTEND_URL}/rezerwacje`,
        });
      }

      return res.send("Reservation closed by provider");
    }

    if (status === "zaakceptowana") {
      if (String(reservation.providerUserId) !== String(authUid)) {
        return res.status(403).json({ message: "Tylko usługodawca może zaakceptować tę rezerwację" });
      }

      reservation.status = "zaakceptowana";
      reservation.pendingExpiresAt = null;
      reservation.closedAt = null;
      reservation.closedBy = null;
      reservation.closedReason = null;

      await reservation.save();

      // usuwamy slot z availableDates jeśli istnieje (tylko hourly)
      if (!reservation.dateOnly) {
        const profile = await Profile.findById(reservation.providerProfileId);
        if (profile && Array.isArray(profile.availableDates)) {
          profile.availableDates = profile.availableDates.filter(
            (slot) =>
              !(
                slot.date === reservation.date &&
                slot.fromTime === reservation.fromTime &&
                slot.toTime === reservation.toTime
              )
          );
          await profile.save();
        }
      }

      if (reservation.userId) {
        await sendPushToUserUid(reservation.userId, {
          title: "Rezerwacja zaakceptowana",
          body: `Twoja rezerwacja z dnia ${reservation.date}${reservation.dateOnly ? "" : ` o ${reservation.fromTime}`} została zaakceptowana`,
          url: `${FRONTEND_URL}/rezerwacje`,
        });
      }

      return res.send("Status updated to accepted");
    }

    // inne statusy — tylko provider
    if (String(reservation.providerUserId) !== String(authUid)) {
      return res.status(403).json({ message: "Brak uprawnień" });
    }

    reservation.status = status;
    await reservation.save();
    return res.send("Status updated");
  } catch (err) {
    console.error("PATCH /reservations/:id/status error", err);
    return res.status(500).send("Błąd serwera");
  }
});

/**
 * =====================
 * GET /api/reservations/meta/:providerUid
 * PUBLIC (dla formularza)
 * =====================
 */
router.get("/meta/:providerUid", async (req, res) => {
  try {
    const { providerUid } = req.params;

    const profile = await Profile.findOne(
      { userId: providerUid },
      {
        _id: 1,
        userId: 1,
        name: 1,
        role: 1,
        bookingMode: 1,
        team: 1,
        services: 1,
        bookingBufferMin: 1,
        workingHours: 1,
        workingDays: 1,
        blockedDays: 1,
        autoAcceptReservations: 1,
        billing: 1,
      }
    ).lean();

    if (!profile) return res.json(null);

    const planAccess = getReservationPlanAccess(profile);

    const activeServices = Array.isArray(profile.services)
      ? profile.services.filter((s) => s?.isActive !== false)
      : [];

    const activeServiceIds = new Set(activeServices.map((s) => String(s._id)));

    const shouldLoadStaff =
      planAccess.bookingMode === "calendar" &&
      planAccess.team?.enabled === true;

    const staff = shouldLoadStaff
      ? await Staff.find(
        { profileId: profile._id, active: true },
        { _id: 1, name: 1, capacity: 1, serviceIds: 1 }
      ).lean()
      : [];

    const normalizedStaff = Array.isArray(staff)
      ? staff
        .map((s) => ({
          ...s,
          serviceIds: Array.isArray(s.serviceIds)
            ? s.serviceIds.filter((id) => activeServiceIds.has(String(id)))
            : [],
        }))
        .filter((s) => (s.serviceIds || []).length > 0 || !activeServices.length)
      : [];

    return res.json({
      providerProfileId: profile._id,
      providerProfileName: profile.name || "Profil",
      providerProfileRole: profile.role || "Brak roli",

      bookingMode: planAccess.bookingMode,
      team: planAccess.team,

      services: activeServices,
      staff: normalizedStaff,

      bookingBufferMin: planAccess.bookingBufferMin,

      autoAcceptReservations:
        planAccess.canUseBooking && profile.autoAcceptReservations === true,

      workingHours: profile.workingHours || { from: "08:00", to: "20:00" },
      workingDays: Array.isArray(profile.workingDays)
        ? profile.workingDays
        : [1, 2, 3, 4, 5],

      blockedDays:
        planAccess.bookingMode === "request-blocking" &&
          Array.isArray(profile.blockedDays)
          ? profile.blockedDays
          : [],

      billingPublic: planAccess.billingPublic,
    });
  } catch (e) {
    console.error("GET /reservations/meta error", e);
    return res.status(500).json({ message: "Błąd pobierania meta" });
  }
});

/**
 * =====================
 * PATCH /api/reservations/:id/seen
 * AUTH:
 *  - client może oznaczyć client
 *  - provider może oznaczyć provider
 * =====================
 */
router.patch("/:id/seen", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { who } = req.body;

  try {
    const authUid = req.auth.uid;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send("Reservation not found");

    if (who === "client") {
      if (!reservation.userId || String(reservation.userId) !== String(authUid)) {
        return res.status(403).json({ message: "Brak uprawnień" });
      }
      reservation.clientSeen = true;
    }

    if (who === "provider") {
      if (String(reservation.providerUserId) !== String(authUid)) {
        return res.status(403).json({ message: "Brak uprawnień" });
      }
      reservation.providerSeen = true;
    }

    await reservation.save();
    return res.send("Seen updated");
  } catch (e) {
    console.error("PATCH /reservations/:id/seen error:", e);
    return res.status(500).send("Błąd serwera");
  }
});

module.exports = router;