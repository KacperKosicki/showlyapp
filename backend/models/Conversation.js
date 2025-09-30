const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  fromUid: { type: String, ref: 'User', required: true },
  toUid: { type: String, ref: 'User', required: true },
  content: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new Schema({
  channel: {
    type: String,
    enum: ['account_to_profile', 'profile_to_account', 'system'],
    required: true,
  },
  pairKey: { type: String, required: true }, // np. "A|B"

  participants: [{ uid: { type: String, ref: 'User', required: true } }],

  firstFromUid: { type: String, required: true },

  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  isClosed: { type: Boolean, default: false }
});

// Indeksy (bez unikalności)
conversationSchema.index({ pairKey: 1, channel: 1, updatedAt: -1 });
// Dodatkowy indeks pod starter i stan
conversationSchema.index({ pairKey: 1, channel: 1, firstFromUid: 1, isClosed: 1, updatedAt: -1 });

// auto updatedAt
conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
