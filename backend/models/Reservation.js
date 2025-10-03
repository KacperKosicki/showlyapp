const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  // KLIENT
  userId: { type: String, required: true },   // Firebase UID klienta
  userName: { type: String },

  // USŁUGODAWCA
  providerUserId: { type: String, required: true }, // Firebase UID usługodawcy
  providerName: { type: String },

  // PROFIL USŁUGODAWCY
  providerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  providerProfileName: { type: String },
  providerProfileRole: { type: String },

  // DATA / CZAS
  date: { type: String, required: true },       // "YYYY-MM-DD"
  dateOnly: { type: Boolean, default: false },  // true = rezerwacja całego dnia
  fromTime: {
    type: String,
    required: function () { return !this.dateOnly; } // wymagane tylko gdy godzinowa
  },
  toTime: {
    type: String,
    required: function () { return !this.dateOnly; }
  },

  duration: { type: Number },   // w minutach (opcjonalne)
  description: { type: String },
  serviceName: { type: String, default: null }, // snapshot nazwy usługi (tylko calendar)

  // STATUS
  status: {
    type: String,
    enum: ['oczekująca', 'zaakceptowana', 'odrzucona', 'anulowana', 'tymczasowa'],
    default: 'oczekująca'
  },

  // „żywotność” oczekującej/hold (bez TTL – zamieniamy je na zamknięte w backendzie)
  pendingExpiresAt: { type: Date, default: null },
  holdExpiresAt: { type: Date, default: null },

  // Zamknięcie i widoczność
  closedAt: { type: Date, default: null },                         // kiedy zamknięta (anul/odrz/expire)
  closedBy: { type: String, enum: ['client','provider','system', null], default: null },
  closedReason: { type: String, enum: ['cancelled','rejected','expired', null], default: null },
  clientSeen: { type: Boolean, default: false },                   // czy klient już „przeczytał”
  providerSeen: { type: Boolean, default: false },                 // czy usługodawca już „przeczytał”
}, { timestamps: true });

/**
 * INDEKSY
 */

// TTL: MongoDB usuwa dokument z ustawionym closedAt po czasie retencji
reservationSchema.index(
  { closedAt: 1 },
  { expireAfterSeconds: Number(process.env.RESERVATION_RETENTION_SECONDS ?? 7 * 24 * 3600) }
);

// ⛔️ UWAGA: celowo bez TTL na pendingExpiresAt/holdExpiresAt — wygaszamy w backendzie,
// żeby wyświetlić drugiej stronie komunikat „OK, widzę”.

// unikalność zaakceptowanego dnia (dla trybu day)
reservationSchema.index(
  { providerUserId: 1, date: 1 },
  { unique: true, partialFilterExpression: { dateOnly: true, status: 'zaakceptowana' } }
);

// przyspieszenie typowych zapytań
reservationSchema.index({ providerUserId: 1, date: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
