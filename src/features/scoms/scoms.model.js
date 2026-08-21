const mongoose = require('mongoose');

const scomImageSchema = new mongoose.Schema({
    key: { type: String, required: true },
    originalName: { type: String }
}, {
    timestamps: true
});

const scomSchema = new mongoose.Schema({
    ID: { type: String, required: true },
    Group: { type: String, required: true },
    Scoms: { type: String, required: true },
    Symptom: { type: String, required: false },
    CheckPoint: { type: String, required: false },
    Steps: { type: String, required: false },
    NormalValue: { type: String, required: false },
    Equipment: { type: String, required: false },
    hidden: { type: Boolean, default: false },
    // Images embedded inline in the Steps rich text editor (RichTextField),
    // stored the same way onu-configs stores its screenshots.
    Images: { type: [scomImageSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('Scom', scomSchema);
