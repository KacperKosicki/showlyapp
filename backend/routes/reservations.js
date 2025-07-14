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

// PATCH /api/reservations/:id/status – aktualizacja statusu
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['oczekująca', 'zaakceptowana', 'odrzucona', 'anulowana'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Nieprawidłowy status' });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!reservation) return res.status(404).json({ message: 'Nie znaleziono rezerwacji' });

    res.json({ message: 'Status zaktualizowany', reservation });

  } catch (err) {
    console.error('❌ Błąd zmiany statusu:', err);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
