const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
  photos: {
    type: [String],
    default: []
  },
  role: String,
  rating: Number,
  reviews: Number,
  ratedBy: [{
    userId: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, minlength: 5, maxlength: 100 },
    userName: String,
  }],
  location: String,
  tags: [String],
  priceFrom: Number,
  priceTo: Number,
  visits: { type: Number, default: 0 },
  showAvailableDates: { type: Boolean, default: true },
  availableDates: [
    {
      date: String,       // np. "2025-07-15"
      fromTime: String,   // np. "14:00"
      toTime: String      // np. "16:00"
    }
  ],
  blockedDays: { type: [String], default: [] }, // ⬅️ np. ["2025-10-12"]
  services: {
    type: [
      {
        name: { type: String, required: true },
        duration: {
          value: { type: Number, required: true },
          unit: { type: String, enum: ['minutes', 'hours', 'days'], required: true }
        }
      }
    ],
    default: []
  },
  workingHours: {
    from: { type: String, default: '08:00' },   // początek dnia roboczego
    to: { type: String, default: '20:00' }    // koniec dnia roboczego
  },
  workingDays: {
    type: [Number],                             // 0 = niedziela, …, 6 = sobota
    default: [1, 2, 3, 4, 5]                        // domyślnie pn–pt
  },
  bookingMode: {
    type: String,
    enum: ['calendar', 'request-blocking', 'request-open'],
    default: 'request-open' // najbezpieczniejsza wartość
  },
  team: {
    enabled: { type: Boolean, default: false }, // włącz/wyłącz zespół dla kalendarza
    assignmentMode: {                           // sposób przypisania osoby
      type: String,
      enum: ['user-pick', 'auto-assign'],
      default: 'user-pick'
    }
  },
  favoritesCount: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  visibleUntil: { type: Date, required: true },
  description: String,
  links: [String],
  profileType: String,
  hasBusiness: Boolean,
  nip: String,
  slug: { type: String, required: true, unique: true },
  quickAnswers: {
    type: [
      {
        title: String,
        answer: String
      }
    ],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
