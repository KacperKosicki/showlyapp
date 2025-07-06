const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
  role: String,
  rating: Number,
  reviews: Number,
  ratedBy: [{
    userId: String,
    rating: Number,
    comment: String,
    userName: String,
  }],
  location: String,
  tags: [String],
  priceFrom: Number,
  priceTo: Number,
  availabilityDate: String,
  availableDates: [String],
  isVisible: { type: Boolean, default: true },
  visibleUntil: { type: Date, required: true },
  description: String,
  links: [String],
  profileType: String,
  hasBusiness: Boolean,
  nip: String,
  slug: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
