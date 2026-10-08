const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  authorName: { type: String, required: true, maxlength: 80 },
  title: { type: String, required: true, minlength: 5, maxlength: 100 },
  description: { type: String, required: true, minlength: 30, maxlength: 4000 },
  category: { type: String, required: true },
  workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], required: true },
  location: { type: String, default: '', maxlength: 100 },
  scope: { type: String, enum: ['once', 'project', 'recurring'], required: true },
  dateMode: { type: String, enum: ['flexible', 'exact', 'range'], required: true },
  dateFrom: { type: String, default: '' },
  dateTo: { type: String, default: '' },
  budgetMode: { type: String, enum: ['negotiable', 'fixed', 'range'], required: true },
  budgetMin: { type: Number, default: null },
  budgetMax: { type: Number, default: null },
  state: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
  publishedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ ownerUid: 1, deletedAt: 1, createdAt: -1 });
module.exports = mongoose.model('Announcement', schema);
