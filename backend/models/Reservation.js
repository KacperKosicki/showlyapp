const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId: { type: String, required: true },              // UID klienta (Firebase)
  userName: { type: String },                            // Nazwa klienta

  providerUserId: { type: String, required: true },      // UID usługodawcy
  providerName: { type: String },                        // Nazwa użytkownika usługodawcy

  providerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  providerProfileName: { type: String },                 // Nazwa profilu (np. "Anna Nowak")
  providerProfileRole: { type: String },                 // Rola (np. "Fryzjer")

  date: { type: String, required: true },                // np. "2025-07-13"
  fromTime: { type: String, required: true },            // "18:00"
  toTime: { type: String, required: true },              // "20:00"
  duration: { type: Number },                            // np. 120 (minuty)

  description: { type: String },

  status: {
    type: String,
    enum: ['oczekująca', 'zaakceptowana', 'odrzucona', 'anulowana'],
    default: 'oczekująca'
  }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
