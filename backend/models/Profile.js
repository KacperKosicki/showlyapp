const mongoose = require("mongoose");

const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const ratedBySchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, minlength: 10, maxlength: 200, default: "" },
    userName: { type: String, default: "" },
    userAvatar: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const availableDateSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // np. "2025-07-15"
    fromTime: { type: String, required: true }, // np. "14:00"
    toTime: { type: String, required: true }, // np. "16:00"
  },
  { _id: false }
);

const quickAnswerSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true, maxlength: 80 },
    answer: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { _id: false }
);

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
      default: () => ({ url: "", publicId: "" }),
    },

    gallery: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 6,
        message: "Maksymalnie 6 zdjęć w galerii usługi.",
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
      }, // np. "za usługę", "za projekt", "za godzinę", "za sztukę"
      note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 120,
      }, // np. "Cena zależy od wielkości tortu"
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
      }, // np. "czas wizyty", "czas realizacji"
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
      }, // np. "do 3 dni", "1–2 tygodnie"
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

// Dodatkowa walidacja logiki ceny
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
      return next(new Error("Dla price.mode='range' wymagane są price.from i price.to."));
    }

    if (this.price.to < this.price.from) {
      return next(new Error("price.to nie może być mniejsze niż price.from."));
    }
  }

  next();
});

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },

    name: { type: String, default: "", trim: true },
    avatar: {
      type: imageSchema,
      default: () => ({ url: "", publicId: "" }),
    },

    photos: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 6,
        message: "Maksymalnie 6 zdjęć w galerii profilu.",
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

    showAvailableDates: { type: Boolean, default: true },
    availableDates: {
      type: [availableDateSchema],
      default: [],
    },

    blockedDays: { type: [String], default: [] },

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

    team: {
      enabled: { type: Boolean, default: false },
      assignmentMode: {
        type: String,
        enum: ["user-pick", "auto-assign"],
        default: "user-pick",
      },
    },

    favoritesCount: { type: Number, default: 0 },

    isVisible: { type: Boolean, default: true },
    visibleUntil: { type: Date, required: true },

    description: { type: String, default: "", trim: true, maxlength: 3000 },
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

    slug: { type: String, required: true, unique: true, trim: true },

    quickAnswers: {
      type: [quickAnswerSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 3,
        message: "Maksymalnie 3 szybkie odpowiedzi.",
      },
    },
  },
  { timestamps: true }
);

// Dodatkowa walidacja profilu
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

  next();
});

// =========================
// INDEKSY POD WYSZUKIWARKĘ
// =========================

// główny text search
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

// pomocnicze indeksy do filtrowania i sortowania
profileSchema.index({ isVisible: 1, visibleUntil: 1 });
profileSchema.index({ rating: -1, reviews: -1 });
profileSchema.index({ location: 1 });
profileSchema.index({ bookingMode: 1 });
profileSchema.index({ favoritesCount: -1 });
profileSchema.index({ visits: -1 });
profileSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Profile", profileSchema);