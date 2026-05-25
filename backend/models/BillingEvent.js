// models/BillingEvent.js
const mongoose = require("mongoose");

const billingEventSchema = new mongoose.Schema(
  {
    // ID eventu ze Stripe, np. evt_123
    // Dzięki temu webhook jest idempotentny i nie przetworzy dwa razy tej samej płatności
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Typ eventu, np. checkout.session.completed, invoice.paid
    type: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },

    // ID głównego obiektu Stripe, np. session/subscription/invoice
    objectId: {
      type: String,
      default: "",
      trim: true,
    },

    // Czy event pochodzi z trybu live
    livemode: {
      type: Boolean,
      default: false,
    },

    // Status przetwarzania eventu po naszej stronie
    status: {
      type: String,
      enum: ["received", "processed", "skipped", "failed"],
      default: "received",
    },

    // UID użytkownika, jeżeli udało się go odczytać z metadata
    uid: {
      type: String,
      default: "",
      trim: true,
    },

    // Plan, jeśli event dotyczy subskrypcji Showly
    plan: {
      type: String,
      enum: ["", "free", "standard", "premium"],
      default: "",
    },

    // Krótki opis błędu, jeśli coś pójdzie nie tak
    errorMessage: {
      type: String,
      default: "",
    },

    // Dodatkowe informacje debugowe, ale bez zapisywania całego ogromnego eventu Stripe
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingEvent", billingEventSchema);