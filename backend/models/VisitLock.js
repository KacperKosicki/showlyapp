// models/VisitLock.js
const mongoose = require('mongoose');

const visitLockSchema = new mongoose.Schema({
  ownerUid:   { type: String, required: true },  // właściciel profilu (profile.userId)
  viewerKey:  { type: String, required: true },  // 'uid:<uid>' albo 'ipua:<ip>:<ua>'
  createdAt:  { type: Date, default: Date.now, expires: 21600 }, // TTL 6h (21600s)
});

// unikalność pary (ownerUid, viewerKey) w oknie TTL
visitLockSchema.index({ ownerUid: 1, viewerKey: 1 }, { unique: true });

module.exports = mongoose.model('VisitLock', visitLockSchema);
