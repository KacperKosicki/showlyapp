const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  applicantUid: { type: String, required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  message: { type: String, required: true, minlength: 20, maxlength: 2000 },
  proposedBudget: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'shortlisted', 'declined', 'withdrawn'], default: 'pending' },
}, { timestamps: true });
schema.index({ announcementId: 1, applicantUid: 1 }, { unique: true });
schema.index({ applicantUid: 1, createdAt: -1 });
module.exports = mongoose.model('AnnouncementApplication', schema);
