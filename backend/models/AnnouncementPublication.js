const mongoose = require('mongoose');

// A single atomic publication slot per account, including on standalone MongoDB.
// No TTL index: expired announcements remain available in their owner's archive.
const schema = new mongoose.Schema({
  ownerUid: { type: String, required: true, unique: true },
  announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  publishedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1, announcementId: 1 });
module.exports = mongoose.model('AnnouncementPublication', schema);
