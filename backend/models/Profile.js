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
  showAvailableDates: { type: Boolean, default: true },
  availableDates: [
    {
      date: String,       // np. "2025-07-15"
      fromTime: String,   // np. "14:00"
      toTime: String      // np. "16:00"
    }
  ],
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
