const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  fromUid: { type: String, ref: 'User', required: true }, // referencja do User
  toUid: { type: String, ref: 'User', required: true },   // referencja do User
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new Schema({
  participants: [
    {
      uid: { type: String, ref: 'User', required: true } // zamiast imienia – referencja
    }
  ],
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now }
});

// automatyczna aktualizacja updatedAt przy nowych wiadomościach
conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
