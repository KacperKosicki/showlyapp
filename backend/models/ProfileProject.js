const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, default: '', trim: true, maxlength: 40 },
  description: { type: String, default: '', trim: true, maxlength: 800 },
  outcome: { type: String, default: '', trim: true, maxlength: 240 },
  photoKey: { type: String, default: '', maxlength: 2048 },
  featured: { type: Boolean, default: false },
}, { _id: false });
