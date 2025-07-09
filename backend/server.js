const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Połączono z MongoDB (SHOWLY)'))
.catch(err => console.error('❌ Błąd połączenia z MongoDB:', err));

// Przykładowa trasa testowa
app.get('/', (req, res) => {
  res.send('API Showly działa!');
});

//Profile
const profilesRoutes = require('./routes/profiles');
app.use('/api/profiles', profilesRoutes);

//Uzytkownicy
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// Wiadomości
const conversationRoutes = require('./routes/conversations');
app.use('/api/conversations', conversationRoutes);

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
