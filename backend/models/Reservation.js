const mongoose = require('mongoose');

// models/Reservation.js
const reservationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },

  providerUserId: { type: String, required: true },
  providerName: { type: String },

  providerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  providerProfileName: { type: String },
  providerProfileRole: { type: String },

  date: { type: String, required: true },       // "YYYY-MM-DD"
  dateOnly: { type: Boolean, default: false },  // ⬅️ NOWE

  fromTime: {
    type: String,
    required: function () { return !this.dateOnly; } // ⬅️ wymagane tylko gdy nie-day
  },
  toTime: {
    type: String,
    required: function () { return !this.dateOnly; } // ⬅️ jw.
  },

  duration: { type: Number },
  description: { type: String },

  status: {
    type: String,
    enum: ['oczekująca', 'zaakceptowana', 'odrzucona', 'anulowana'],
    default: 'oczekująca'
  }
}, { timestamps: true });

// (opcjonalnie) unikalność zaakceptowanego dnia u usługodawcy
reservationSchema.index(
  { providerUserId: 1, date: 1 },
  { unique: true, partialFilterExpression: { dateOnly: true, status: 'zaakceptowana' } }
);

module.exports = mongoose.model('Reservation', reservationSchema);
