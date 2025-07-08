const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  from: String,
  to: String,
  content: String,
  read: { type: Boolean, default: false },
  threadId: String, // 🔁 Identyfikator konwersacji
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
