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

  // 🔹 PERSONEL (dla trybu calendar + team)
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  staffName: { type: String, default: null },        // snapshot (np. do listy bez joinów)
  staffAutoAssigned: { type: Boolean, default: false }, // true jeśli backend przydzielił automatem

  // DATA / CZAS (oryginalne pola – zostają)
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

  // 🔹 ZNORMALIZOWANE CZASY (ułatwiają wyszukiwanie konfliktów dla godzinowych)
  // Uzupełnij je w kontrolerze przy tworzeniu/aktualizacji rezerwacji.
  startAt: {
    type: Date,
    required: function () { return !this.dateOnly; },
    default: null
  },
  endAt: {
    type: Date,
    required: function () { return !this.dateOnly; },
    default: null
  },

  duration: { type: Number },   // w minutach (opcjonalne)
  description: { type: String },

  // UŚLUGA (zostawiamy jak było – String; jeśli przejdziesz na ObjectId, zmienisz później)
  serviceId: { type: String, default: null },
  serviceName: { type: String, default: null }, // snapshot nazwy usługi (tylko calendar/day)

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
  closedBy: { type: String, enum: ['client', 'provider', 'system', null], default: null },
  closedReason: { type: String, enum: ['cancelled', 'rejected', 'expired', null], default: null },
  clientSeen: { type: Boolean, default: false },                   // czy klient już „przeczytał”
  providerSeen: { type: Boolean, default: false }                  // czy usługodawca już „przeczytał”
}, { timestamps: true });

/**
 * INDEKSY
 */

// TTL: MongoDB usuwa dokument z ustawionym closedAt po czasie retencji
reservationSchema.index(
  { closedAt: 1 },
  { expireAfterSeconds: Number(process.env.RESERVATION_RETENTION_SECONDS ?? 7 * 24 * 3600) }
);

// unikalność zaakceptowanego dnia (dla trybu day – bez personelu)
reservationSchema.index(
  { providerUserId: 1, date: 1 },
  { unique: true, partialFilterExpression: { dateOnly: true, status: 'zaakceptowana' } }
);

// 🔹 Przyspieszenie typowych zapytań
reservationSchema.index({ providerUserId: 1, date: 1, status: 1 });

// 🔹 Kontrola konfliktów i szybkie szukanie slotów w trybie godzinowym per osoba
// (działa gdy masz startAt/endAt oraz staffId; partial – tylko dla godzinowych)
reservationSchema.index(
  { providerProfileId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 },
  { partialFilterExpression: { dateOnly: false } }
);

module.exports = mongoose.model('Reservation', reservationSchema);
