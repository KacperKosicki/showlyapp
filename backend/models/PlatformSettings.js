const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: { type: String, default: 'platform' },
  betaPremiumEnabled: { type: Boolean, default: false },
  enabledAt: { type: Date, default: null },
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', schema);
