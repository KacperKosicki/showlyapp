// models/Profile.js
const mongoose = require("mongoose");

const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// =========================
// OBRAZY
// =========================
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    hash: { type: String, default: "" },
  },
  { _id: false }
);

// =========================
// OCENY / OPINIE
// =========================
const ratedBySchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, minlength: 10, maxlength: 200, default: "" },
    userName: { type: String, default: "" },
    userAvatar: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// =========================
// TERMINY — STARE POLE / KOMPATYBILNOŚĆ
// =========================
// Zostawiamy na razie, żeby nie rozwalić obecnego frontu/routes.
// Docelowo logika dostępności powinna iść przez:
// workingDays + workingHours + availabilityOverrides + Reservation.
const availableDateSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // np. "2025-07-15"
    fromTime: { type: String, required: true }, // np. "14:00"
    toTime: { type: String, required: true }, // np. "16:00"
  },
  { _id: false }
);

// =========================
// WYJĄTKI / BLOKADY DOSTĘPNOŚCI — NOWE POLE
// =========================
// type: "day"  -> cały dzień niedostępny
// type: "slot" -> konkretny zakres godzin niedostępny
const availabilityOverrideSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["day", "slot"],
      required: true,
    },

    date: {
      type: String,
      required: true,
      trim: true,
    },

    fromTime: {
      type: String,
      default: "",
      trim: true,
    },

    toTime: {
      type: String,
      default: "",
      trim: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
  },
  { _id: true }
);

// =========================
// SZYBKIE ODPOWIEDZI
// =========================
const quickAnswerSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true, maxlength: 80 },
    answer: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { _id: false }
);

// =========================
// BILLING / PLAN
// =========================
const billingSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["free", "standard", "premium"],
      default: "free",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "inactive",
        "pending",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
      ],
      default: "inactive",
      index: true,
    },

    stripeCustomerId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripeSubscriptionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripePriceId: {
      type: String,
      default: "",
      trim: true,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    lastPaymentFailedAt: {
      type: Date,
      default: null,
    },

    graceUntil: {
      type: Date,
      default: null,
    },

    // Na przyszłość, gdybyś chciał ręcznie komuś dać więcej limitów
    featureOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

// =========================
// USŁUGI / OFERTA
// =========================
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1200,
    },

    category: {
      type: String,
      enum: [
        "service",
        "product",
        "project",
        "artwork",
        "handmade",
        "event",
        "lesson",
        "consultation",
        "custom",
      ],
      default: "service",
    },

    image: {
      type: imageSchema,
      default: () => ({ url: "", publicId: "", hash: "" }),
    },

    // Techniczny limit pod największy plan.
    // Biznesowe limity Free/Standard/Premium sprawdzamy w routes.
    gallery: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 10,
        message: "Maksymalnie 10 zdjęć w galerii usługi.",
      },
    },

    price: {
      mode: {
        type: String,
        enum: ["fixed", "from", "range", "contact", "free"],
        default: "contact",
      },

      amount: {
        type: Number,
        default: null,
        min: 0,
      },

      from: {
        type: Number,
        default: null,
        min: 0,
      },

      to: {
        type: Number,
        default: null,
        min: 0,
      },

      currency: {
        type: String,
        default: "PLN",
        trim: true,
        uppercase: true,
        maxlength: 8,
      },

      unitLabel: {
        type: String,
        default: "",
        trim: true,
        maxlength: 30,
      },

      note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 120,
      },
    },

    duration: {
      value: {
        type: Number,
        default: null,
        min: 0,
      },

      unit: {
        type: String,
        enum: ["minutes", "hours", "days", "weeks"],
        default: "minutes",
      },

      label: {
        type: String,
        default: "",
        trim: true,
        maxlength: 40,
      },
    },

    booking: {
      enabled: {
        type: Boolean,
        default: false,
      },

      type: {
        type: String,
        enum: ["calendar", "request", "none"],
        default: "none",
      },
    },

    delivery: {
      mode: {
        type: String,
        enum: ["onsite", "online", "shipping", "pickup", "hybrid", "none"],
        default: "none",
      },

      turnaroundText: {
        type: String,
        default: "",
        trim: true,
        maxlength: 80,
      },
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 10,
        message: "Maksymalnie 10 tagów dla jednej usługi.",
      },
    },

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Dodatkowa walidacja logiki ceny usługi
serviceSchema.pre("validate", function (next) {
  const mode = this?.price?.mode;

  if (mode === "fixed") {
    if (this.price.amount === null || this.price.amount === undefined) {
      return next(new Error("Dla price.mode='fixed' wymagane jest price.amount."));
    }
  }

  if (mode === "from") {
    if (this.price.from === null || this.price.from === undefined) {
      return next(new Error("Dla price.mode='from' wymagane jest price.from."));
    }
  }

  if (mode === "range") {
    if (
      this.price.from === null ||
      this.price.from === undefined ||
      this.price.to === null ||
      this.price.to === undefined
    ) {
      return next(
        new Error("Dla price.mode='range' wymagane są price.from i price.to.")
      );
    }

    if (this.price.to < this.price.from) {
      return next(new Error("price.to nie może być mniejsze niż price.from."));
    }
  }

  next();
});

// =========================
// PROFIL
// =========================
const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: { type: String, default: "", trim: true },

    avatar: {
      type: imageSchema,
      default: () => ({ url: "", publicId: "", hash: "" }),
    },

    banner: {
      type: imageSchema,
      default: () => ({ url: "", publicId: "", hash: "" }),
    },

    // Techniczny limit pod Premium.
    // Free/Standard/Premium pilnujemy w backend routes.
    photos: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 20,
        message: "Maksymalnie 20 zdjęć w galerii profilu.",
      },
    },

    role: { type: String, default: "", trim: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    ratedBy: {
      type: [ratedBySchema],
      default: [],
    },

    location: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },

    priceFrom: { type: Number, default: null, min: 0 },
    priceTo: { type: Number, default: null, min: 0 },

    visits: { type: Number, default: 0 },

    // Stare ustawienie — zostawione dla kompatybilności.
    showAvailableDates: { type: Boolean, default: true },

    // Stare ręczne terminy — zostawione dla kompatybilności.
    availableDates: {
      type: [availableDateSchema],
      default: [],
    },

    // Stare blokowane dni — można później przenieść do availabilityOverrides.
    blockedDays: {
      type: [String],
      default: [],
    },

    // Nowa, docelowa warstwa blokad/wyjątków dostępności.
    availabilityOverrides: {
      type: [availabilityOverrideSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 365,
        message: "Maksymalnie 365 wyjątków dostępności.",
      },
    },

    services: {
      type: [serviceSchema],
      default: [],
    },

    workingHours: {
      from: { type: String, default: "08:00" },
      to: { type: String, default: "20:00" },
    },

    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 6),
        message: "workingDays musi zawierać wartości od 0 do 6.",
      },
    },

    bookingBufferMin: {
      type: Number,
      enum: [0, 5, 10, 15],
      default: 0,
    },

    bookingMode: {
      type: String,
      enum: ["calendar", "request-blocking", "request-open"],
      default: "request-open",
    },

    autoAcceptReservations: {
      type: Boolean,
      default: false,
    },

    team: {
      enabled: { type: Boolean, default: false },

      assignmentMode: {
        type: String,
        enum: ["user-pick", "auto-assign"],
        default: "user-pick",
      },
    },

    partnership: {
      isPartner: { type: Boolean, default: false },

      tier: {
        type: String,
        enum: [
          "none",
          "partner",
          "verified",
          "ambassador",
          "founding-partner",
          "owner",
        ],
        default: "none",
      },

      label: {
        type: String,
        default: "",
        trim: true,
        maxlength: 40,
      },

      badgeText: {
        type: String,
        default: "",
        trim: true,
        maxlength: 60,
      },

      color: {
        type: String,
        default: "#59d0ff",
        validate: {
          validator: (v) => !v || hex.test(v),
          message: "partnership.color musi być HEX (#RGB lub #RRGGBB)",
        },
      },

      priority: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },

      since: {
        type: Date,
        default: null,
      },
    },

    favoritesCount: { type: Number, default: 0 },

    // Widoczność profilu publicznego
    isVisible: { type: Boolean, default: true },

    visibleUntil: {
      type: Date,
      required: true,
    },

    // Technicznie dajemy większy limit.
    // Limit planu będzie pilnowany osobno.
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 8000,
    },

    links: { type: [String], default: [] },

    contact: {
      street: { type: String, default: "", trim: true },
      postcode: { type: String, default: "", trim: true },
      addressFull: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
    },

    socials: {
      website: { type: String, default: "", trim: true },
      facebook: { type: String, default: "", trim: true },
      instagram: { type: String, default: "", trim: true },
      youtube: { type: String, default: "", trim: true },
      tiktok: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
      x: { type: String, default: "", trim: true },
    },

    profileType: { type: String, default: "", trim: true },

    hasBusiness: { type: Boolean, default: false },
    nip: { type: String, default: "", trim: true },

    theme: {
      variant: {
        type: String,
        enum: ["system", "violet", "blue", "green", "orange", "red", "dark"],
        default: "system",
      },

      primary: {
        type: String,
        default: "",
        validate: {
          validator: (v) => !v || hex.test(v),
          message: "theme.primary musi być HEX (#RGB lub #RRGGBB)",
        },
      },

      secondary: {
        type: String,
        default: "",
        validate: {
          validator: (v) => !v || hex.test(v),
          message: "theme.secondary musi być HEX (#RGB lub #RRGGBB)",
        },
      },
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Techniczny limit pod Premium.
    // Free/Standard/Premium limitujemy w routes.
    quickAnswers: {
      type: [quickAnswerSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 10,
        message: "Maksymalnie 10 szybkich odpowiedzi.",
      },
    },

    // Plany i płatności
    billing: {
      type: billingSchema,
      default: () => ({
        plan: "free",
        status: "inactive",
        stripeCustomerId: "",
        stripeSubscriptionId: "",
        stripePriceId: "",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        lastPaymentAt: null,
        lastPaymentFailedAt: null,
        graceUntil: null,
        featureOverrides: {},
      }),
    },
  },
  { timestamps: true }
);

// =========================
// DODATKOWA WALIDACJA PROFILU
// =========================
profileSchema.pre("validate", function (next) {
  if (
    this.priceFrom !== null &&
    this.priceFrom !== undefined &&
    this.priceTo !== null &&
    this.priceTo !== undefined &&
    this.priceTo < this.priceFrom
  ) {
    return next(new Error("priceTo nie może być mniejsze niż priceFrom."));
  }

  if (this?.partnership?.isPartner && this?.partnership?.tier === "none") {
    this.partnership.tier = "partner";
  }

  if (!this?.partnership?.isPartner) {
    this.partnership.tier = "none";
  }

  // Walidacja availabilityOverrides.
  // Dla type="day" godziny nie są wymagane.
  // Dla type="slot" muszą być fromTime i toTime.
  if (Array.isArray(this.availabilityOverrides)) {
    for (const item of this.availabilityOverrides) {
      if (!item?.type || !["day", "slot"].includes(item.type)) {
        return next(
          new Error("availabilityOverrides.type musi mieć wartość 'day' albo 'slot'.")
        );
      }

      if (!item?.date) {
        return next(new Error("availabilityOverrides.date jest wymagane."));
      }

      if (item.type === "slot") {
        if (!item.fromTime || !item.toTime) {
          return next(
            new Error(
              "Dla availabilityOverrides.type='slot' wymagane są fromTime i toTime."
            )
          );
        }

        if (item.fromTime >= item.toTime) {
          return next(
            new Error(
              "availabilityOverrides.toTime musi być późniejsze niż fromTime."
            )
          );
        }
      }

      if (item.type === "day") {
        item.fromTime = "";
        item.toTime = "";
      }
    }
  }

  // Jeżeli ktoś ma aktywny/płatny booking, ale plan nieaktywny,
  // nie robimy tu blokady, bo to będzie pilnowane w routes.
  // Dzięki temu stare profile nie wywalą walidacji przy migracji.

  next();
});

// =========================
// INDEKSY POD WYSZUKIWARKĘ
// =========================
profileSchema.index(
  {
    name: "text",
    role: "text",
    location: "text",
    tags: "text",
    description: "text",
    profileType: "text",
    "services.name": "text",
    "services.shortDescription": "text",
    "services.description": "text",
    "services.tags": "text",
  },
  {
    name: "profile_text_search_idx",
    default_language: "none",
    weights: {
      name: 12,
      role: 10,
      "services.name": 11,
      location: 8,
      tags: 7,
      profileType: 6,
      "services.tags": 6,
      "services.shortDescription": 5,
      description: 4,
      "services.description": 3,
    },
  }
);

// =========================
// INDEKSY POMOCNICZE
// =========================
profileSchema.index({ isVisible: 1, visibleUntil: 1 });
profileSchema.index({ rating: -1, reviews: -1 });
profileSchema.index({ location: 1 });
profileSchema.index({ bookingMode: 1 });
profileSchema.index({ favoritesCount: -1 });
profileSchema.index({ visits: -1 });
profileSchema.index({ createdAt: -1 });

profileSchema.index({ "billing.plan": 1 });
profileSchema.index({ "billing.status": 1 });
profileSchema.index({ "billing.stripeCustomerId": 1 });
profileSchema.index({ "billing.stripeSubscriptionId": 1 });
profileSchema.index({ "billing.currentPeriodEnd": 1 });

// Przyda się przy pobieraniu profili z blokadami w kalendarzu/rezerwacjach.
profileSchema.index({ "availabilityOverrides.date": 1 });
profileSchema.index({ "availabilityOverrides.type": 1 });

module.exports = mongoose.model("Profile", profileSchema);
