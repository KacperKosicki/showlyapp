const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Staff = require('../models/Staff');

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

// helpery
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// Uwaga: jeśli masz strefy, tu trzeba skonwertować lokalny czas na UTC. Na razie prosta wersja:
const toDateTime = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00.000Z`);

const ALIVE_STATUSES = ['zaakceptowana', 'oczekująca', 'tymczasowa'];

// ⬇️ wspólny warunek czasowy z buforem (w minutach)
function mongoTimeCondition(startAt, endAt, bufferMin = SLOT_BREAK_MIN) {
  const bufMs = (Number(bufferMin) || 0) * 60000;
  return {
    startAt: { $lt: new Date(endAt.getTime() + bufMs) },
    endAt: { $gt: new Date(startAt.getTime() - bufMs) },
  };
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

  const candidates = all.filter((s) =>
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
    { status: 'oczekująca', pendingExpiresAt: { $lte: now } },
    {
      $set: {
        status: 'anulowana',
        closedAt: now,
        closedBy: 'system',
        closedReason: 'expired',
        clientSeen: false,
        providerSeen: false,
      },
    }
  );
}

/**
 * =====================
 * POST /api/reservations – godzinowa (normalna)
 * =====================
 */
router.post('/', async (req, res) => {
  try {
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

    if (!userId || !providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }

    const startAt = toDateTime(date, fromTime);
    const endAt = toDateTime(date, toTime);

    const [user, provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: userId }),
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);
    if (!profile) return res.status(404).json({ message: 'Profil usługodawcy nie istnieje' });

    // ✅ bufor z profilu (0/5/10/15)
    const bufferMin = normalizeBuffer(profile?.bookingBufferMin);
    // ✅ 5 + bufor z profilu
    const effectiveBufferMin = getEffectiveBufferMin(profile);

    const serviceName =
      profile?.services?.find((s) => String(s._id) === String(serviceId))?.name || null;

    const isCalendarTeam = profile.bookingMode === 'calendar' && profile.team?.enabled === true;

    let staffDocFinal = null;
    let staffAutoAssigned = false;

    if (isCalendarTeam) {
      const mode = profile.team.assignmentMode; // 'user-pick' | 'auto-assign'

      if (mode === 'user-pick') {
        if (!staffIdFromClient) return res.status(400).json({ message: 'Wybierz pracownika' });

        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: 'Nieprawidłowy pracownik' });

        const canDoService = (staffDoc.serviceIds || []).some(
          (id) => String(id) === String(serviceId)
        );
        if (!canDoService)
          return res.status(400).json({ message: 'Wybrana osoba nie wykonuje tej usługi' });

        staffDocFinal = staffDoc;
      }

      if (mode === 'auto-assign' && !staffIdFromClient) {
        const picked = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          bufferMin: effectiveBufferMin,
        });
        if (!picked) return res.status(409).json({ message: 'Brak dostępnego pracownika' });
        staffDocFinal = picked;
        staffAutoAssigned = true;
      }

      if (mode === 'auto-assign' && staffIdFromClient && !staffDocFinal) {
        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: 'Nieprawidłowy pracownik' });

        const canDoService = (staffDoc.serviceIds || []).some(
          (id) => String(id) === String(serviceId)
        );
        if (!canDoService)
          return res.status(400).json({ message: 'Wybrana osoba nie wykonuje tej usługi' });

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
        return res.status(409).json({ message: 'Wybrany slot dla tej osoby jest zajęty.' });
      }
    } else {
      const now = new Date();
      const existing = await Reservation.find({
        providerUserId,
        date,
        status: { $in: ALIVE_STATUSES },
        $or: [
          { status: 'zaakceptowana' },
          { status: 'oczekująca', pendingExpiresAt: { $gt: now } },
          { status: 'tymczasowa', holdExpiresAt: { $gt: now } },
        ],
      }).lean();

      const reqStart = toMin(fromTime);
      const reqEnd = toMin(toTime) + effectiveBufferMin;

      const hasCollision = existing.some((d) => {
        const s = toMin(d.fromTime);
        const e = toMin(d.toTime) + effectiveBufferMin;
        return overlap(reqStart, reqEnd, s, e);
      });
      if (hasCollision)
        return res.status(409).json({ message: 'Wybrany slot jest zajęty lub niedostępny.' });
    }

    const pendingExpiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    const newReservation = await Reservation.create({
      offline: false,
      userId,
      userName: user?.name || 'Klient',

      providerUserId,
      providerName: provider?.name || 'Usługodawca',

      providerProfileId,
      providerProfileName: profile?.name || 'Profil',
      providerProfileRole: profile?.role || 'Brak roli',

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
      status: 'oczekująca',
      pendingExpiresAt,
      holdExpiresAt: null,

      closedAt: null,
      closedBy: null,
      closedReason: null,
      clientSeen: false,
      providerSeen: false,
    });

    res.status(201).json({ message: 'Rezerwacja utworzona', reservation: newReservation });
  } catch (err) {
    console.error('❌ Błąd tworzenia rezerwacji:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err?.message || err });
  }
});

/**
 * =====================
 * POST /api/reservations/offline – godzinowa (NOWE)
 * - wpis ręczny usługodawcy
 * - od razu status: zaakceptowana
 * =====================
 */
router.post('/offline', async (req, res) => {
  try {
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

    if (!providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({
        message: 'Brakuje wymaganych pól (providerUserId, providerProfileId, date, fromTime, toTime).',
      });
    }
    if (!offlineClientName || !String(offlineClientName).trim()) {
      return res
        .status(400)
        .json({ message: 'Podaj offlineClientName (np. imię/nazwa klienta).' });
    }

    const startAt = toDateTime(date, fromTime);
    const endAt = toDateTime(date, toTime);

    const [provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);
    if (!profile) return res.status(404).json({ message: 'Profil usługodawcy nie istnieje' });

    const bufferMin = normalizeBuffer(profile?.bookingBufferMin);
    const effectiveBufferMin = getEffectiveBufferMin(profile);

    const isCalendarTeam = profile.bookingMode === 'calendar' && profile.team?.enabled === true;

    // ustal serviceName (snapshot)
    const serviceName =
      serviceNameFromClient ||
      profile?.services?.find((s) => String(s._id) === String(serviceId))?.name ||
      null;

    let staffDocFinal = null;
    let staffAutoAssigned = false;

    if (isCalendarTeam) {
      const mode = profile.team.assignmentMode; // 'user-pick' | 'auto-assign'
      const preferredStaffId = staffIdFromProvider || null;

      if (mode === 'user-pick' || preferredStaffId) {
        if (!preferredStaffId) return res.status(400).json({ message: 'Wybierz pracownika (staffId).' });

        const staffDoc = await Staff.findOne({
          _id: preferredStaffId,
          profileId: providerProfileId,
          active: true,
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: 'Nieprawidłowy pracownik' });

        if (serviceId) {
          const canDoService = (staffDoc.serviceIds || []).some(
            (id) => String(id) === String(serviceId)
          );
          if (!canDoService)
            return res.status(400).json({ message: 'Wybrana osoba nie wykonuje tej usługi' });
        }

        staffDocFinal = staffDoc;
      }

      if (mode === 'auto-assign' && !staffDocFinal) {
        if (!serviceId) return res.status(400).json({ message: 'Dla auto-assign wymagany serviceId.' });

        const picked = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          bufferMin: effectiveBufferMin,
        });
        if (!picked) return res.status(409).json({ message: 'Brak dostępnego pracownika' });

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
        return res.status(409).json({ message: 'Wybrany slot dla tej osoby jest zajęty.' });
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
      if (hasCollision)
        return res.status(409).json({ message: 'Wybrany slot jest zajęty lub niedostępny.' });
    }

    const created = await Reservation.create({
      offline: true,
      offlineClientName: String(offlineClientName).trim(),
      offlineClientPhone: offlineClientPhone ? String(offlineClientPhone).trim() : null,
      offlineNote: offlineNote ? String(offlineNote).trim() : null,

      userId: null,
      userName: String(offlineClientName).trim(),

      providerUserId,
      providerName: provider?.name || 'Usługodawca',

      providerProfileId,
      providerProfileName: profile?.name || 'Profil',
      providerProfileRole: profile?.role || 'Brak roli',

      staffId: staffDocFinal?._id || null,
      staffName: staffDocFinal?.name || null,
      staffAutoAssigned,

      date,
      dateOnly: false,
      fromTime,
      toTime,
      startAt,
      endAt,

      description: (description || '').trim(),
      serviceId: serviceId || null,
      serviceName: serviceName || null,

      status: 'zaakceptowana',
      pendingExpiresAt: null,
      holdExpiresAt: null,

      closedAt: null,
      closedBy: null,
      closedReason: null,

      providerSeen: true,
      clientSeen: true,
    });

    res.status(201).json({ message: 'Offline rezerwacja utworzona', reservation: created });
  } catch (err) {
    console.error('❌ POST /reservations/offline error:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err?.message || err });
  }
});

/**
 * =====================
 * POST /api/reservations/day – rezerwacja całego dnia (normalna)
 * =====================
 */
router.post('/day', async (req, res) => {
  try {
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

    if (!userId || !providerUserId || !providerProfileId || !date) {
      return res.status(400).json({ message: 'Brak wymaganych pól.' });
    }

    const profile = await Profile.findOne({ userId: providerUserId }, { blockedDays: 1, services: 1 }).lean();

    if (profile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: 'Ten dzień jest zablokowany przez usługodawcę.' });
    }

    const existsAccepted = await Reservation.findOne({
      providerUserId,
      date,
      dateOnly: true,
      status: 'zaakceptowana',
    }).lean();
    if (existsAccepted) return res.status(409).json({ message: 'Ten dzień jest już zajęty.' });

    const now = new Date();
    const dupPending = await Reservation.findOne({
      userId,
      providerUserId,
      date,
      dateOnly: true,
      status: 'oczekująca',
      pendingExpiresAt: { $gt: now },
    }).lean();
    if (dupPending) return res.status(409).json({ message: 'Masz już oczekującą prośbę na ten dzień.' });

    let serviceName = svcNameFromClient || null;
    if (!serviceName && serviceId && Array.isArray(profile?.services)) {
      const svc = profile.services.find((s) => String(s._id) === String(serviceId));
      if (svc) serviceName = svc.name;
    }

    const pendingExpiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

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
      fromTime: '00:00',
      toTime: '23:59',
      description: (description || '').trim(),

      status: 'oczekująca',
      pendingExpiresAt,

      serviceId: serviceId || null,
      serviceName: serviceName || null,

      closedAt: null,
      closedBy: null,
      closedReason: null,
      clientSeen: false,
      providerSeen: false,
    });

    res.json(created);
  } catch (e) {
    console.error('POST /reservations/day error', e);
    res.status(500).json({ message: 'Nie udało się utworzyć rezerwacji dnia.' });
  }
});

/**
 * =====================
 * POST /api/reservations/offline/day – rezerwacja całego dnia (NOWE)
 * - od razu zaakceptowana
 * =====================
 */
router.post('/offline/day', async (req, res) => {
  try {
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

    if (!providerUserId || !providerProfileId || !date) {
      return res.status(400).json({
        message: 'Brakuje wymaganych pól (providerUserId, providerProfileId, date).',
      });
    }
    if (!offlineClientName || !String(offlineClientName).trim()) {
      return res.status(400).json({ message: 'Podaj offlineClientName (np. imię/nazwa klienta).' });
    }

    const [provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);
    if (!profile) return res.status(404).json({ message: 'Profil usługodawcy nie istnieje' });

    const fullProfile = await Profile.findOne({ userId: providerUserId }, { blockedDays: 1, services: 1 }).lean();

    if (fullProfile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: 'Ten dzień jest zablokowany przez usługodawcę.' });
    }

    const existsAccepted = await Reservation.findOne({
      providerUserId,
      date,
      dateOnly: true,
      status: 'zaakceptowana',
    }).lean();
    if (existsAccepted) return res.status(409).json({ message: 'Ten dzień jest już zajęty.' });

    let serviceName = svcNameFromClient || null;
    if (!serviceName && serviceId && Array.isArray(fullProfile?.services)) {
      const svc = fullProfile.services.find((s) => String(s._id) === String(serviceId));
      if (svc) serviceName = svc.name;
    }

    const created = await Reservation.create({
      offline: true,
      offlineClientName: String(offlineClientName).trim(),
      offlineClientPhone: offlineClientPhone ? String(offlineClientPhone).trim() : null,
      offlineNote: offlineNote ? String(offlineNote).trim() : null,

      userId: null,
      userName: String(offlineClientName).trim(),

      providerUserId,
      providerName: provider?.name || 'Usługodawca',

      providerProfileId,
      providerProfileName: profile?.name || 'Profil',
      providerProfileRole: profile?.role || 'Brak roli',

      date,
      dateOnly: true,
      fromTime: '00:00',
      toTime: '23:59',
      description: (description || '').trim(),

      status: 'zaakceptowana',
      pendingExpiresAt: null,

      serviceId: serviceId || null,
      serviceName: serviceName || null,

      closedAt: null,
      closedBy: null,
      closedReason: null,

      providerSeen: true,
      clientSeen: true,
    });

    res.status(201).json({ message: 'Offline day utworzony', reservation: created });
  } catch (e) {
    console.error('POST /reservations/offline/day error', e);
    res.status(500).json({ message: 'Nie udało się utworzyć offline day.' });
  }
});

/**
 * =====================
 * GET /api/reservations/by-user/:uid
 * =====================
 */
router.get('/by-user/:uid', async (req, res) => {
  try {
    await closeExpiredPending();
    const now = new Date();
    const reservations = await Reservation.find({
      userId: req.params.uid,
      $or: [
        { status: 'zaakceptowana' },
        { status: 'oczekująca', pendingExpiresAt: { $gt: now } },
        { status: { $in: ['anulowana', 'odrzucona'] }, clientSeen: false },
      ],
    }).sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji użytkownika:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * =====================
 * GET /api/reservations/by-provider/:uid
 * ✅ zwraca też OFFLINE (bo to też Reservation)
 * =====================
 */
router.get('/by-provider/:uid', async (req, res) => {
  try {
    await closeExpiredPending();
    const now = new Date();
    const reservations = await Reservation.find({
      providerUserId: req.params.uid,
      $or: [
        { status: 'zaakceptowana' },
        { status: 'oczekująca', pendingExpiresAt: { $gt: now } },
        { status: { $in: ['anulowana', 'odrzucona'] }, providerSeen: false },
      ],
    }).sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji usługodawcy:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * =====================
 * GET /unavailable-days/:providerUid
 * =====================
 */
router.get('/unavailable-days/:providerUid', async (req, res) => {
  try {
    const { providerUid } = req.params;

    const profile = await Profile.findOne({ userId: providerUid }, { blockedDays: 1, _id: 0 }).lean();

    const blocked = profile?.blockedDays || [];

    const takenDocs = await Reservation.find(
      { providerUserId: providerUid, dateOnly: true, status: 'zaakceptowana' },
      { date: 1, _id: 0 }
    ).lean();

    const taken = takenDocs.map((d) => d.date);
    const all = Array.from(new Set([...blocked, ...taken]));
    res.json(all);
  } catch (e) {
    console.error('GET /reservations/unavailable-days error', e);
    res.status(500).json({ message: 'Błąd pobierania dni niedostępnych' });
  }
});

/**
 * =====================
 * PATCH /:id/status
 * =====================
 */
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Reservation not found');

    const now = new Date();

    if (status === 'anulowana') {
      reservation.status = 'anulowana';
      reservation.closedAt = now;
      reservation.closedBy = 'client';
      reservation.closedReason = 'cancelled';
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = true;
      reservation.providerSeen = false;
      await reservation.save();
      return res.send('Reservation closed by client');
    }

    if (status === 'odrzucona') {
      reservation.status = 'odrzucona';
      reservation.closedAt = now;
      reservation.closedBy = 'provider';
      reservation.closedReason = 'rejected';
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = false;
      reservation.providerSeen = true;
      await reservation.save();
      return res.send('Reservation closed by provider');
    }

    if (status === 'zaakceptowana') {
      reservation.status = 'zaakceptowana';
      reservation.pendingExpiresAt = null;
      reservation.closedAt = null;
      reservation.closedBy = null;
      reservation.closedReason = null;
      await reservation.save();

      const profile = await Profile.findById(reservation.providerProfileId);
      if (profile && Array.isArray(profile.availableDates)) {
        profile.availableDates = profile.availableDates.filter(
          (slot) =>
            !(slot.date === reservation.date && slot.fromTime === reservation.fromTime && slot.toTime === reservation.toTime)
        );
        await profile.save();
      }

      return res.send('Status updated to accepted');
    }

    reservation.status = status;
    await reservation.save();
    res.send('Status updated');
  } catch (err) {
    console.error('PATCH /reservations/:id/status error', err);
    res.status(500).send('Błąd serwera');
  }
});

// =====================
// GET /api/reservations/meta/:providerUid
// - żeby frontend zawsze miał providerProfileId + staff listę
// =====================
router.get('/meta/:providerUid', async (req, res) => {
  try {
    const { providerUid } = req.params;

    const profile = await Profile.findOne(
      { userId: providerUid },
      {
        _id: 1,
        name: 1,
        role: 1,
        bookingMode: 1,
        team: 1,
        services: 1,
        bookingBufferMin: 1, // ✅ DODANE

        workingHours: 1,
        workingDays: 1,
        blockedDays: 1,
      }
    ).lean();

    if (!profile) return res.status(404).json({ message: 'Profil nie istnieje' });

    const staff = await Staff.find(
      { profileId: profile._id, active: true },
      { _id: 1, name: 1, capacity: 1, serviceIds: 1 }
    ).lean();

    res.json({
      providerProfileId: profile._id,
      providerProfileName: profile.name || 'Profil',
      providerProfileRole: profile.role || 'Brak roli',

      bookingMode: profile.bookingMode,
      team: profile.team || { enabled: false },
      services: profile.services || [],
      staff: staff || [],

      bookingBufferMin: normalizeBuffer(profile.bookingBufferMin), // ✅ DODANE

      workingHours: profile.workingHours || { from: '08:00', to: '20:00' },
      workingDays: Array.isArray(profile.workingDays) ? profile.workingDays : [1, 2, 3, 4, 5],
      blockedDays: Array.isArray(profile.blockedDays) ? profile.blockedDays : [],
    });
  } catch (e) {
    console.error('GET /reservations/meta error', e);
    res.status(500).json({ message: 'Błąd pobierania meta' });
  }
});

/**
 * =====================
 * PATCH /:id/seen
 * =====================
 */
router.patch('/:id/seen', async (req, res) => {
  const { id } = req.params;
  const { who } = req.body;
  try {
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Reservation not found');

    if (who === 'client') reservation.clientSeen = true;
    if (who === 'provider') reservation.providerSeen = true;
    await reservation.save();
    res.send('Seen updated');
  } catch (e) {
    console.error('PATCH /reservations/:id/seen error', e);
    res.status(500).send('Błąd serwera');
  }
});

module.exports = router;