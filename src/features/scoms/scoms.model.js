const mongoose = require('mongoose');

const scomImageSchema = new mongoose.Schema({
    key: { type: String, required: true },
    originalName: { type: String }
}, {
    timestamps: true
});

// One entry per repair step, replacing the old single Steps HTML blob so the
// technician-facing page can show a title + description per step instead of
// one flat block of text. `_id: false` — order in the array is the only
// position that matters, no per-step identity is needed.
const scomStepItemSchema = new mongoose.Schema({
    StepTitle: { type: String, required: false },
    Description: { type: String, required: false }
}, {
    _id: false,
    timestamps: false
});

const scomSchema = new mongoose.Schema({
    ID: { type: String, required: true },
    Group: { type: String, required: true },
    Scoms: { type: String, required: true },
    Symptom: { type: String, required: false },
    CheckPoint: { type: String, required: false },
    // Legacy single-blob steps field — no longer written by the admin form
    // (see StepItems below), kept only so records saved before this change
    // keep rendering on the technician-facing page.
    Steps: { type: String, required: false },
    StepItems: { type: [scomStepItemSchema], default: [] },
    NormalValue: { type: String, required: false },
    Equipment: { type: String, required: false },
    hidden: { type: Boolean, default: false },
    // Images embedded inline in a step's Description rich text editor
    // (RichTextField), stored the same way onu-configs stores its screenshots.
    Images: { type: [scomImageSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('Scom', scomSchema);
