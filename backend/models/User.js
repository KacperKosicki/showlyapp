// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  firebaseUid:  { type: String, required: true },
  name:         { type: String, default: 'Użytkownik' },
  displayName:  { type: String, default: '' },
  avatar:       { type: String, default: '' },
  provider:     { type: String, enum: ['google', 'password'], required: true },

  // ✅ NOWE
  role:         { type: String, enum: ['user', 'mod', 'admin'], default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);