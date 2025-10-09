const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Profile = require('../models/Profile');

// === USTAWIENIA ===
const PENDING_MINUTES = Number(process.env.PENDING_MINUTES ?? 1);  // np. 60 w produkcji
const SLOT_BUFFER_MIN = 15;

// helper – kolizje
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// Zamień przeterminowane „oczekujące” na zamknięte („wygasłe”), widoczne TYLKO u klienta
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
        providerSeen: false // usługodawca nie będzie widział „wygasła”
      }
    }
  );
}

// =====================
// POST /api/reservations  – rezerwacja godzinowa
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
    } = req.body;

    if (!userId || !providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }

    // kolizje na żywych/twardych wpisach
    const now = new Date();
    const existing = await Reservation.find({
      providerUserId,
      date,
      status: { $in: ['zaakceptowana', 'oczekująca', 'tymczasowa'] },
      $or: [
        { status: 'zaakceptowana' },
        { status: 'oczekująca', pendingExpiresAt: { $gt: now } },
        { status: 'tymczasowa',  holdExpiresAt:    { $gt: now } },
      ],
    }).lean();

    const reqStart = toMin(fromTime);
    const reqEnd   = toMin(toTime) + SLOT_BUFFER_MIN;

    const hasCollision = existing.some(d => {
      const s = toMin(d.fromTime);
      const e = toMin(d.toTime) + SLOT_BUFFER_MIN;
      return overlap(reqStart, reqEnd, s, e);
    });
    if (hasCollision) {
      return res.status(409).json({ message: 'Wybrany slot jest zajęty lub niedostępny.' });
    }

    // ładne nazwy
    const [user, provider, profile] = await Promise.all([
      User.findOne({ firebaseUid: userId }),
      User.findOne({ firebaseUid: providerUserId }),
      Profile.findById(providerProfileId),
    ]);

    const serviceName =
      profile?.services?.find(s => String(s._id) === String(serviceId))?.name || null;

    const pendingExpiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);

    const newReservation = await Reservation.create({
      userId,
      userName: user?.name || 'Klient',
      providerUserId,
      providerName: provider?.name || 'Usługodawca',
      providerProfileId,
      providerProfileName: profile?.name || 'Profil',
      providerProfileRole: profile?.role || 'Brak roli',
      date,
      fromTime,
      toTime,
      duration,
      description,
      status: 'oczekująca',
      pendingExpiresAt,
      holdExpiresAt: null,
      serviceName,
    });

    res.status(201).json({ message: 'Rezerwacja utworzona', reservation: newReservation });
  } catch (err) {
    console.error('❌ Błąd tworzenia rezerwacji:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err?.message || err });
  }
});

// =====================
// GET /api/reservations/by-user/:uid – widok klienta
//   - zaakceptowane
//   - żywe oczekujące
//   - zamknięte (anul/odrz/wygasła), jeśli clientSeen === false
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
        { status: { $in: ['anulowana','odrzucona'] }, clientSeen: false },
      ],
    }).sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji użytkownika:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// =====================
// GET /api/reservations/by-provider/:uid – widok usługodawcy
//   - zaakceptowane
//   - żywe oczekujące
//   - zamknięte, jeśli providerSeen === false
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
        { status: { $in: ['anulowana','odrzucona'] }, providerSeen: false },
      ],
    }).sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji usługodawcy:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// =====================
// GET /unavailable-days – (bez zmian)
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
// POST /day – rezerwacja całego dnia (ustawiamy pendingExpiresAt)
// =====================
router.post('/day', async (req, res) => {
  try {
    const {
      userId, userName,
      providerUserId, providerName,
      providerProfileId, providerProfileName, providerProfileRole,
      date, description,
      serviceId,        // <--- NOWE
      serviceName: svcNameFromClient // <--- (opcjonalne)
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

    // --- Ustal serviceName ---
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
      serviceId: serviceId || null,      // <--- NOWE
      serviceName: serviceName || null,  // <--- NOWE
    });

    res.json(created);
  } catch (e) {
    console.error('POST /reservations/day error', e);
    res.status(500).json({ message: 'Nie udało się utworzyć rezerwacji dnia.' });
  }
});

// =====================
// PATCH /:id/status – zmiana statusu + zamknięcie + oznaczenie aktora jako „seen”
// =====================
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Reservation not found');

    const now = new Date();

    // anulowana przez klienta → zobaczy to tylko usługodawca
    if (status === 'anulowana') {
      reservation.status = 'anulowana';
      reservation.closedAt = now;
      reservation.closedBy = 'client';
      reservation.closedReason = 'cancelled';
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = true;   // klient nie zobaczy
      reservation.providerSeen = false; // usługodawca zobaczy dopóki nie kliknie „OK, widzę”
      await reservation.save();
      return res.send('Reservation closed by client');
    }

    // odrzucona przez usługodawcę → zobaczy to tylko klient
    if (status === 'odrzucona') {
      reservation.status = 'odrzucona';
      reservation.closedAt = now;
      reservation.closedBy = 'provider';
      reservation.closedReason = 'rejected';
      reservation.pendingExpiresAt = null;
      reservation.clientSeen = false;   // klient zobaczy
      reservation.providerSeen = true;  // usługodawca nie
      await reservation.save();
      return res.send('Reservation closed by provider');
    }

    // zaakceptowana → normalnie (i zdejmujemy slot z availableDates)
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

    // inne (raczej nieużywane)
    reservation.status = status;
    await reservation.save();
    res.send('Status updated');
  } catch (err) {
    console.error('PATCH /reservations/:id/status error', err);
    res.status(500).send('Błąd serwera');
  }
});

// =====================
// PATCH /:id/seen – „OK, widzę” (usuwa z listy patrzącego; TTL skasuje dokument później)
// payload: { who: 'client' | 'provider' }
// =====================
router.patch('/:id/seen', async (req, res) => {
  const { id } = req.params;
  const { who } = req.body; // 'client' | 'provider'
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
