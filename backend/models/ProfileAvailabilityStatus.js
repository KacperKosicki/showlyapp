const mongoose = require('mongoose');
const validDate = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

module.exports = new mongoose.Schema({
  state: { type: String, enum: ['hidden', 'open', 'limited', 'from-date', 'unavailable'], default: 'hidden' },
  availableFrom: { type: String, default: '', required: function () { return this.state === 'from-date'; }, validate: { validator: validDate, message: 'Podaj poprawną datę dostępności.' } },
  until: { type: String, default: '', validate: { validator: function (value) { return validDate(value) && !(this.state === 'from-date' && value && this.availableFrom > value); }, message: 'Podaj poprawną datę wygaśnięcia, nie wcześniejszą niż dostępność.' } },
  note: { type: String, default: '', trim: true, maxlength: 120 },
}, { _id: false });
