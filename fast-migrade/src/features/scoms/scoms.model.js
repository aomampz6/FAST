const mongoose = require('mongoose');

const scomSchema = new mongoose.Schema({
    ID: { type: String, required: true },
    Group: { type: String, required: true },
    Scoms: { type: String, required: true },
    Symptom: { type: String, required: false },
    CheckPoint: { type: String, required: false },
    Steps: { type: String, required: false },
    NormalValue: { type: String, required: false },
    Equipment: { type: String, required: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Scom', scomSchema);
