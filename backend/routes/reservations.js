const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Profile = require('../models/Profile'); // ⬅️ dodaj import profilu

// POST /api/reservations – utwórz nową rezerwację
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
      description
    } = req.body;

    if (!userId || !providerUserId || !providerProfileId || !date || !fromTime || !toTime) {
      return res.status(400).json({ message: 'Brakuje wymaganych pól' });
    }

    // Pobranie danych użytkownika i profilu
    const user = await User.findOne({ firebaseUid: userId });
    const provider = await User.findOne({ firebaseUid: providerUserId });
    const profile = await Profile.findById(providerProfileId);

    // Tworzenie rezerwacji z dodatkowymi danymi
    const newReservation = new Reservation({
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
      description
    });

    await newReservation.save();
    res.status(201).json({ message: 'Rezerwacja utworzona', reservation: newReservation });

  } catch (err) {
    console.error('❌ Błąd tworzenia rezerwacji:', err);
    res.status(500).json({ message: 'Błąd serwera', error: err });
  }
});

// GET /api/reservations/by-user/:uid – rezerwacje użytkownika
router.get('/by-user/:uid', async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.params.uid }).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji użytkownika:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// GET /api/reservations/by-provider/:uid – rezerwacje usługodawcy
router.get('/by-provider/:uid', async (req, res) => {
  try {
    const reservations = await Reservation.find({ providerUserId: req.params.uid }).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    console.error('❌ Błąd pobierania rezerwacji usługodawcy:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

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

router.post('/day', async (req, res) => {
  try {
    const {
      userId, userName,
      providerUserId, providerName,
      providerProfileId, providerProfileName, providerProfileRole,
      date, description
    } = req.body;

    if (!userId || !providerUserId || !providerProfileId || !date) {
      return res.status(400).json({ message: 'Brak wymaganych pól.' });
    }

    // czy dzień zablokowany
    const profile = await Profile.findOne({ userId: providerUserId }, { blockedDays: 1 }).lean();
    if (profile?.blockedDays?.includes(date)) {
      return res.status(409).json({ message: 'Ten dzień jest zablokowany przez usługodawcę.' });
    }

    // czy już zaakceptowana dzienna na ten dzień
    const existsAccepted = await Reservation.findOne({
      providerUserId,
      date,
      dateOnly: true,
      status: 'zaakceptowana'
    }).lean();

    if (existsAccepted) {
      return res.status(409).json({ message: 'Ten dzień jest już zajęty.' });
    }

    // opcjonalnie: zduplikowana oczekująca od tego samego klienta
    const dupPending = await Reservation.findOne({
      userId,
      providerUserId,
      date,
      dateOnly: true,
      status: 'oczekująca'
    }).lean();

    if (dupPending) {
      return res.status(409).json({ message: 'Masz już oczekującą prośbę na ten dzień.' });
    }

    const created = await Reservation.create({
      userId, userName,
      providerUserId, providerName,
      providerProfileId, providerProfileName, providerProfileRole,
      date,
      dateOnly: true,
      fromTime: '00:00',
      toTime: '23:59',
      description,
      status: 'oczekująca'
    });

    res.json(created);
  } catch (e) {
    console.error('POST /reservations/day error', e);
    res.status(500).json({ message: 'Nie udało się utworzyć rezerwacji dnia.' });
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Reservation not found');

    reservation.status = status;
    await reservation.save();

    // Jeśli zaakceptowano → usuń termin z profilu usługodawcy
    if (status === 'zaakceptowana') {
      const profile = await Profile.findById(reservation.providerProfileId);
      if (profile) {
        profile.availableDates = profile.availableDates.filter(slot =>
          !(slot.date === reservation.date &&
            slot.fromTime === reservation.fromTime &&
            slot.toTime === reservation.toTime)
        );
        await profile.save();
      }
    }

    res.send('Status updated');
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd serwera');
  }
});


module.exports = router;
