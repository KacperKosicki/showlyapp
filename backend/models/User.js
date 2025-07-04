const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firebaseUid: { type: String, required: true },
  name: { type: String, default: 'Użytkownik' },
  provider: { type: String, enum: ['google', 'password'], required: true } // ⬅️ kluczowa zmiana
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
