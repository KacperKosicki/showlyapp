const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // ⬅️ DODAJ

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 jeżeli app stoi za proxy (Nginx/Cloudflare), to req.ip będzie poprawne
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/slots', require('./routes/slots'));

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Połączono z MongoDB (SHOWLY)');

  // ⛳️ Upewnij się, że indeksy dla VisitLock (TTL + unique) są założone
  try {
    const VisitLock = require('./models/VisitLock');
    await VisitLock.syncIndexes();
    console.log('✅ Indeksy VisitLock zsynchronizowane');
  } catch (e) {
    console.error('❌ Błąd synchronizacji indeksów VisitLock:', e);
  }

  // (opcjonalnie) zadbaj też o unikalne indeksy w Profile (slug, userId)
  // Uwaga: na dużych kolekcjach może to potrwać przy pierwszym uruchomieniu.
  try {
    const Profile = require('./models/Profile');
    await Profile.syncIndexes();
    console.log('✅ Indeksy Profile zsynchronizowane');
  } catch (e) {
    console.error('❌ Błąd synchronizacji indeksów Profile:', e);
  }
})
.catch(err => console.error('❌ Błąd połączenia z MongoDB:', err));

// Healthcheck
app.get('/', (req, res) => {
  res.send('API Showly działa!');
});

// Profile
const profilesRoutes = require('./routes/profiles');
app.use('/api/profiles', profilesRoutes);

// Użytkownicy
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// Wiadomości
const conversationRoutes = require('./routes/conversations');
app.use('/api/conversations', conversationRoutes);

// Rezerwacje
const reservationRoutes = require('./routes/reservations');
app.use('/api/reservations', reservationRoutes);

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
