const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
    Type: { type: String, required: true },
    Parameter: { type: String, required: true },
    Standard: { type: String, required: true },
    Recommendation: { type: String, required: false },
    Level: { type: String, enum: ['danger', 'warning', 'info', 'none'], default: 'none' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Parameter', parameterSchema);
