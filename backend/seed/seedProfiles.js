const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Profile = require('../models/Profile');

dotenv.config();

const mockUsers = [
  {
    name: 'Anna Nowak',
    avatar: 'https://i.pravatar.cc/150?img=12',
    role: 'Programistka front-end',
    rating: 4.9,
    reviews: 23,
    location: 'Warszawa',
    tags: ['React', 'JavaScript', 'UI/UX'],
    available: true,
    price: '250 zł',
    availabilityDate: 'od 10 czerwca',
    availableDates: ['2025-10-10', '2024-06-12', '2024-06-18']
  },
  {
    name: 'Jan Kowalski',
    avatar: 'https://i.pravatar.cc/150?img=1',
    role: 'Grafik',
    rating: 4.7,
    reviews: 18,
    location: 'Kraków',
    tags: ['Photoshop', 'Illustrator', 'Figma'],
    available: true,
    price: '250 zł',
    availabilityDate: 'od 10 czerwca',
    availableDates: ['2024-06-10', '2024-06-12', '2024-06-18']
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Połączono z MongoDB');

    await Profile.deleteMany(); // czyścimy stare dane
    await Profile.insertMany(mockUsers);

    console.log('✅ Mock użytkownicy dodani!');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Błąd seedowania:', err);
  }
};

seedDatabase();
