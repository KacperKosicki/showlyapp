const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  firebaseUid:  { type: String, required: true },
  name:         { type: String, default: 'Użytkownik' }, // możesz używać też displayName
  displayName:  { type: String, default: '' },
  avatar:       { type: String, default: '' },            // ⬅️ URL do avatara (uploads albo CDN)
  provider:     { type: String, enum: ['google', 'password'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
