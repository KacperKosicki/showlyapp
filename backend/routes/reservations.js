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
