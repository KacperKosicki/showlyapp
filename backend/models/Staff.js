const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true, required: true },
    name: { type: String, required: true },
    role: { type: String, default: '' },
    avatar: { type: String, default: '' },
    color: { type: String, default: '' },
    active: { type: Boolean, default: true },

    // które usługi z profilu ta osoba wykonuje (ID usług z Profile.services)
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId }],

    // opcjonalne nadpisania parametrów konkretnej usługi u tej osoby
    overrides: [{
        serviceId: mongoose.Schema.Types.ObjectId,
        priceFrom: Number,
        priceTo: Number,
        durationValue: Number,
        durationUnit: { type: String, enum: ['minuty', 'godziny', 'dni'] }
    }],

    // Godziny pracy per dzień tygodnia (0–6: nd–sb albo dostosuj do swoich konwencji)
    workingHours: {
        type: Map,
        of: [{ start: String, end: String }], // np. [{start:'09:00', end:'17:00'}]
        default: {}
    },
    breaks: [{ date: String, start: String, end: String }], // przerwy jednorazowe
    daysOff: [String],                                      // YYYY-MM-DD
    capacity: { type: Number, default: 1 },                 // równoległe wizyty
}, { timestamps: true });

StaffSchema.index({ profileId: 1, active: 1 });

module.exports = mongoose.model('Staff', StaffSchema);
