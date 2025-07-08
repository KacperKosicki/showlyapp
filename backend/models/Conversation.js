const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  fromUid: String,
  fromName: String,
  toUid: String,
  toName: String,
  content: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new Schema({
  participants: [
    {
      uid: String,
      name: String
    }
  ],
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
