const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 jeżeli app stoi za proxy (Nginx/Cloudflare), to req.ip będzie poprawne
app.set('trust proxy', true);

// ==========================
// ✅ MIDDLEWARE (ORDER MATTERS)
// ==========================
app.use(cors());

// 🔥 1) Stripe WEBHOOK (RAW BODY) — MUSI BYĆ PRZED express.json()
app.use('/api/billing/webhook', require('./routes/billingWebhook'));

// 🔥 2) JSON middleware dla reszty requestów
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================
// ✅ ROUTES
// ==========================

// Stripe Checkout (normalny JSON endpoint)
app.use('/api/billing', require('./routes/billing'));

// Twoje istniejące
app.use('/api/staff', require('./routes/staff'));
app.use('/api/slots', require('./routes/slots'));

// Profile
app.use('/api/profiles', require('./routes/profiles'));

// Użytkownicy
app.use('/api/users', require('./routes/users'));

// Ulubione
app.use('/api/favorites', require('./routes/favorites'));

// Wiadomości
app.use('/api/conversations', require('./routes/conversations'));

// Rezerwacje
app.use('/api/reservations', require('./routes/reservations'));

// ==========================
// ✅ DB CONNECT
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Połączono z MongoDB (SHOWLY)');

    try {
      const VisitLock = require('./models/VisitLock');
      await VisitLock.syncIndexes();
      console.log('✅ Indeksy VisitLock zsynchronizowane');
    } catch (e) {
      console.error('❌ Błąd synchronizacji indeksów VisitLock:', e);
    }

    try {
      const Profile = require('./models/Profile');
      await Profile.syncIndexes();
      console.log('✅ Indeksy Profile zsynchronizowane');
    } catch (e) {
      console.error('❌ Błąd synchronizacji indeksów Profile:', e);
    }
  })
  .catch((err) => console.error('❌ Błąd połączenia z MongoDB:', err));

// ==========================
// ✅ HEALTHCHECK
// ==========================
app.get('/', (req, res) => {
  res.send('API Showly działa!');
});

// ==========================
// ✅ START
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
