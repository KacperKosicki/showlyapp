const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    // ✅ OFFLINE
    offline: { type: Boolean, default: false },

    // KLIENT (online)
    userId: {
      type: String,
      required: function () {
        return !this.offline; // ✅ online wymagany, offline nie
      },
      default: null,
    },
    userName: { type: String, default: null },

    // OFFLINE dane (snapshot)
    offlineClientName: { type: String, default: null },
    offlineClientPhone: { type: String, default: null },
    offlineNote: { type: String, default: null },

    // USŁUGODAWCA
    providerUserId: { type: String, required: true },
    providerName: { type: String, default: null },

    // PROFIL USŁUGODAWCY
    providerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    providerProfileName: { type: String, default: null },
    providerProfileRole: { type: String, default: null },

    // PERSONEL
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    staffName: { type: String, default: null },
    staffAutoAssigned: { type: Boolean, default: false },

    // DATA / CZAS
    date: { type: String, required: true }, // YYYY-MM-DD
    dateOnly: { type: Boolean, default: false },

    fromTime: {
      type: String,
      required: function () {
        return !this.dateOnly;
      },
      default: "00:00",
    },
    toTime: {
      type: String,
      required: function () {
        return !this.dateOnly;
      },
      default: "23:59",
    },

    // CZASY ZNORMALIZOWANE
    startAt: {
      type: Date,
      required: function () {
        return !this.dateOnly;
      },
      default: null,
    },
    endAt: {
      type: Date,
      required: function () {
        return !this.dateOnly;
      },
      default: null,
    },

    duration: { type: Number, default: null },
    description: { type: String, default: "" },

    serviceId: { type: String, default: null },
    serviceName: { type: String, default: null },

    status: {
      type: String,
      enum: ["oczekująca", "zaakceptowana", "odrzucona", "anulowana", "tymczasowa"],
      default: "oczekująca",
    },

    pendingExpiresAt: { type: Date, default: null },
    holdExpiresAt: { type: Date, default: null },

    closedAt: { type: Date, default: null },
    closedBy: { type: String, enum: ["client", "provider", "system", null], default: null },
    closedReason: { type: String, enum: ["cancelled", "rejected", "expired", null], default: null },

    clientSeen: { type: Boolean, default: false },
    providerSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * INDEKSY
 */
reservationSchema.index(
  { closedAt: 1 },
  { expireAfterSeconds: Number(process.env.RESERVATION_RETENTION_SECONDS ?? 7 * 24 * 3600) }
);

reservationSchema.index(
  { providerUserId: 1, date: 1 },
  { unique: true, partialFilterExpression: { dateOnly: true, status: "zaakceptowana" } }
);

reservationSchema.index({ providerUserId: 1, date: 1, status: 1 });

reservationSchema.index(
  { providerProfileId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 },
  { partialFilterExpression: { dateOnly: false } }
);

module.exports = mongoose.model("Reservation", reservationSchema);