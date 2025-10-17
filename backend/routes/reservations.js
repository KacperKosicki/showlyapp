const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Staff = require('../models/Staff');

// === USTAWIENIA ===
const PENDING_MINUTES = Number(process.env.PENDING_MINUTES ?? 60);
const SLOT_BUFFER_MIN = 15;

// helpery
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// Uwaga: jeśli masz strefy, tu trzeba skonwertować lokalny czas na UTC. Na razie prosta wersja:
const toDateTime = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00.000Z`);

const ALIVE_STATUSES = ['zaakceptowana', 'oczekująca', 'tymczasowa'];

// ⬇️ wspólny warunek czasowy z buforem – używany w picku i w finalnym checku
function mongoTimeCondition(startAt, endAt, bufferMin = SLOT_BUFFER_MIN) {
  const bufMs = bufferMin * 60000;
  return {
    // istniejąca.startAt < nowy.koniec + buffer
    startAt: { $lt: new Date(endAt.getTime() + bufMs) },
    // istniejąca.endAt + buffer > nowy.start
    endAt:   { $gt: new Date(startAt.getTime() - bufMs) },
  };
}

// wybór osoby dla auto-assign (z buforem i capacity)
// wybór osoby dla auto-assign (z buforem, capacity i preferencją faktycznie wolnych)
async function pickAvailableStaffForProfile({ providerProfileId, serviceId, startAt, endAt, excludeIds = [] }) {
  const all = await Staff.find({ profileId: providerProfileId, active: true }).lean();

  // Kandydaci, którzy mogą wykonać usługę
  const candidates = all.filter(s =>
    !excludeIds.some(ex => String(ex) === String(s._id)) &&
    (s.serviceIds || []).some(id => String(id) === String(serviceId))
  );

  if (!candidates.length) return null;

  // Dla każdego kandydata policz:
  // - overlapCount: ile rezerwacji (z buforem) nachodzi na żądany slot
  // - loadNow: bieżące obciążenie w tym oknie (ile równoległych wizyt)
  // - lastEndBefore: ostatnia zakończona rezerwacja tego dnia przed startAt (do tie-breakerów)
  const results = await Promise.all(candidates.map(async s => {
    const capacity = Math.max(1, Number(s.capacity) || 1);

    // kolizje w oknie (z buforem)
    const overlapCond = {
      providerProfileId,
      staffId: s._id,
      dateOnly: false,
      status: { $in: ALIVE_STATUSES },
      ...mongoTimeCondition(startAt, endAt), // zawiera SLOT_BUFFER_MIN
    };

    const overlapCount = await Reservation.countDocuments(overlapCond);

    // Jeśli są nakładające się rezerwacje, sprawdź ile ich faktycznie „wchodzi” w capacity
    // (czyli realne obciążenie „tu i teraz”)
    const overlapping = overlapCount > 0
      ? await Reservation.find(overlapCond, { startAt: 1, endAt: 1 }).lean()
      : [];

    // policz ile faktycznie „równoległych” wizyt zachodzi
    // (tu wystarczy sama liczba dokumentów, bo każdy dokument liczy się 1:1 w oknie).
    const loadNow = overlapping.length;

    // ostatnie zakończenie przed startem (do preferencji osoby, która „kończy wcześniej”)
    const lastBefore = await Reservation
      .findOne({
        providerProfileId,
        staffId: s._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        endAt: { $lte: new Date(startAt.getTime() + SLOT_BUFFER_MIN * 60000) } // z szacunkiem do bufora
      })
      .sort({ endAt: -1 })
      .select({ endAt: 1 })
      .lean();

    return {
      staff: s,
      capacity,
      overlapCount,
      loadNow,
      lastEndBefore: lastBefore?.endAt ? lastBefore.endAt.getTime() : 0
    };
  }));

  // 1) Wytnij tych, u których przekroczylibyśmy/osiągnęli capacity w tym oknie
  const feasible = results.filter(r => r.loadNow < r.capacity);

  if (!feasible.length) return null;

  // 2) Preferuj osoby BEZ żadnej kolizji (tzn. realnie wolne w oknie)
  const trulyFree = feasible.filter(r => r.overlapCount === 0);

  const pool = trulyFree.length ? trulyFree : feasible;

  // 3) Sortowanie „fair”:
  //   a) mniej loadNow (mniej równoległych w tym momencie)
  //   b) wcześniejszy lastEndBefore (kto skończył wcześniej, ma „priorytet”)
  //   c) stabilnie po _id (żeby wynik był deterministyczny)
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
      }
    }
  );
}

// =====================
// POST /api/reservations – godzinowa
// =====================
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
      staffId: staffIdFromClient
    } = req.body;

    if (!userId || !providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }

    const startAt = toDateTime(date, fromTime);
    const endAt = toDateTime(date, toTime);

    const [user, provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: userId }),
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId)
    ]);
    if (!profile) return res.status(404).json({ message: 'Profil usługodawcy nie istnieje' });

    const serviceName =
      profile?.services?.find(s => String(s._id) === String(serviceId))?.name || null;

    const isCalendarTeam = profile.bookingMode === 'calendar' && profile.team?.enabled === true;

    let staffDocFinal = null;
    let staffAutoAssigned = false;

    if (isCalendarTeam) {
      const mode = profile.team.assignmentMode; // 'user-pick' | 'auto-assign'

      if (mode === 'user-pick') {
        if (!staffIdFromClient) {
          return res.status(400).json({ message: 'Wybierz pracownika' });
        }
        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: 'Nieprawidłowy pracownik' });

        const canDoService = (staffDoc.serviceIds || []).some(id => String(id) === String(serviceId));
        if (!canDoService) return res.status(400).json({ message: 'Wybrana osoba nie wykonuje tej usługi' });

        staffDocFinal = staffDoc;
      }

      if (mode === 'auto-assign' && !staffIdFromClient) {
        const picked = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt
        });
        if (!picked) {
          return res.status(409).json({ message: 'Brak dostępnego pracownika' });
        }
        staffDocFinal = picked;
        staffAutoAssigned = true;
      }

      // jeśli auto-assign, ale klient manualnie przysłał staffId — zaakceptuj po weryfikacji
      if (mode === 'auto-assign' && staffIdFromClient && !staffDocFinal) {
        const staffDoc = await Staff.findOne({
          _id: staffIdFromClient,
          profileId: providerProfileId,
          active: true
        }).lean();
        if (!staffDoc) return res.status(400).json({ message: 'Nieprawidłowy pracownik' });
        const canDoService = (staffDoc.serviceIds || []).some(id => String(id) === String(serviceId));
        if (!canDoService) return res.status(400).json({ message: 'Wybrana osoba nie wykonuje tej usługi' });
        staffDocFinal = staffDoc;
      }
    }

    // 🔒 KOLIZJE
    if (isCalendarTeam && staffDocFinal?._id) {
      // Końcowa walidacja z buforem dla WYBRANEGO pracownika
      let overlaps = await Reservation.countDocuments({
        providerProfileId,
        staffId: staffDocFinal._id,
        dateOnly: false,
        status: { $in: ALIVE_STATUSES },
        ...mongoTimeCondition(startAt, endAt),
      });

      // RETRY dla auto-assign (np. wyścig: ktoś zajął slot między pickiem a checkiem)
      if (overlaps >= (staffDocFinal.capacity ?? 1) && staffAutoAssigned) {
        const retryPick = await pickAvailableStaffForProfile({
          providerProfileId,
          serviceId,
          startAt,
          endAt,
          excludeIds: [staffDocFinal._id]
        });
        if (retryPick) {
          staffDocFinal = retryPick;
          overlaps = await Reservation.countDocuments({
            providerProfileId,
            staffId: retryPick._id,
            dateOnly: false,
            status: { $in: ALIVE_STATUSES },
            ...mongoTimeCondition(startAt, endAt),
          });
        }
      }

      if (overlaps >= (staffDocFinal.capacity ?? 1)) {
        return res.status(409).json({ message: 'Wybrany slot dla tej osoby jest zajęty.' });
      }
    } else {
      // bez zespołu – dotychczasowa logika z buforem
      const now = new Date();
      const existing = await Reservation.find({
        providerUserId,
        date,
        status: { $in: ALIVE_STATUSES },
        $or: [
          { status: 'zaakceptowana' },
          { status: 'oczekująca', pendingExpiresAt: { $gt: now } },
          { status: 'tymczasowa', holdExpiresAt: { $gt: now } }
        ]
      }).lean();

      const reqStart = toMin(fromTime);
      const reqEnd = toMin(toTime) + SLOT_BUFFER_MIN;

      const hasCollision = existing.some(d => {
        const s = toMin(d.fromTime);
        const e = toMin(d.toTime) + SLOT_BUFFER_MIN;
        return overlap(reqStart, reqEnd, s, e);
      });
      if (hasCollision) {
        return res.status(409).json({ message: 'Wybrany slot jest zajęty lub niedostępny.' });
      }
    }

    const pendingExpiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    const newReservation = await Reservation.create({
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
      holdExpiresAt: null
    });

    res.status(201).json({ message: 'Rezerwacja utworzona', reservation: newReservation });
  } catch (err) {
    console.error('❌ Błąd tworzenia rezerwacji:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err?.message || err });
  }
});

// =====================
// GET /api/reservations/by-user/:uid
// =====================
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

// =====================
// GET /api/reservations/by-provider/:uid
// =====================
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

// =====================
// GET /unavailable-days/:providerUid
// =====================
router.get('/unavailable-days/:providerUid', async (req, res) => {
  try {
    const { providerUid } = req.params;

    const profile = await Profile.findOne(
      { userId: providerUid },
      { blockedDays: 1, _id: 0 }
    ).lean();

    const blocked = profile?.blockedDays || [];

    const takenDocs = await Reservation.find(
      { providerUserId: providerUid, dateOnly: true, status: 'zaakceptowana' },
      { date: 1, _id: 0 }
    ).lean();

    const taken = takenDocs.map(d => d.date);
    const all = Array.from(new Set([...blocked, ...taken]));
    res.json(all);
  } catch (e) {
    console.error('GET /reservations/unavailable-days error', e);
    res.status(500).json({ message: 'Błąd pobierania dni niedostępnych' });
  }
});

// =====================
// POST /api/reservations/day – rezerwacja całego dnia
// =====================
router.post('/day', async (req, res) => {
  try {
    const {
      userId, userName,
      providerUserId, providerName,
      providerProfileId, providerProfileName, providerProfileRole,
      date, description,
      serviceId,
      serviceName: svcNameFromClient
    } = req.body;

    if (!userId || !providerUserId || !providerProfileId || !date) {
      return res.status(400).json({ message: 'Brak wymaganych pól.' });
    }

    const profile = await Profile.findOne(
      { userId: providerUserId },
      { blockedDays: 1, services: 1 }
    ).lean();

    if (profile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: 'Ten dzień jest zablokowany przez usługodawcę.' });
    }

    const existsAccepted = await Reservation.findOne({
      providerUserId, date, dateOnly: true, status: 'zaakceptowana'
    }).lean();
    if (existsAccepted) {
      return res.status(409).json({ message: 'Ten dzień jest już zajęty.' });
    }

    const now = new Date();
    const dupPending = await Reservation.findOne({
      userId, providerUserId, date, dateOnly: true,
      status: 'oczekująca', pendingExpiresAt: { $gt: now }
    }).lean();
    if (dupPending) {
      return res.status(409).json({ message: 'Masz już oczekującą prośbę na ten dzień.' });
    }

    let serviceName = svcNameFromClient || null;
    if (!serviceName && serviceId && Array.isArray(profile?.services)) {
      const svc = profile.services.find(s => String(s._id) === String(serviceId));
      if (svc) serviceName = svc.name;
    }

    const pendingExpiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    const created = await Reservation.create({
      userId, userName,
      providerUserId, providerName,
      providerProfileId, providerProfileName, providerProfileRole,
      date,
      dateOnly: true,
      fromTime: '00:00',
      toTime: '23:59',
      description: (description || '').trim(),
      status: 'oczekująca',
      pendingExpiresAt,
      serviceId: serviceId || null,
      serviceName: serviceName || null,
    });

    res.json(created);
  } catch (e) {
    console.error('POST /reservations/day error', e);
    res.status(500).json({ message: 'Nie udało się utworzyć rezerwacji dnia.' });
  }
});

// =====================
// PATCH /:id/status
// =====================
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
        profile.availableDates = profile.availableDates.filter(slot =>
          !(slot.date === reservation.date &&
            slot.fromTime === reservation.fromTime &&
            slot.toTime === reservation.toTime)
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
// PATCH /:id/seen
// =====================
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
