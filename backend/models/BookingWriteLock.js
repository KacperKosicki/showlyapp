const mongoose = require('mongoose');
const schema = new mongoose.Schema({ _id: String, token: String, expiresAt: Date }, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('BookingWriteLock', schema);
