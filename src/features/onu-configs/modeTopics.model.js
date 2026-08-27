const mongoose = require('mongoose');

// The central "Mode (หัวข้อการตั้งค่า)" list offered in the ONU/ATA config
// admin form's dropdown — shared across every brand/model of a device type
// so topic wording stays consistent (and therefore groupable) without being
// hardcoded in the frontend.
const modeTopicSchema = new mongoose.Schema({
    Label: { type: String, required: true, trim: true },
    DeviceType: { type: String, enum: ['ONU', 'ATA'], default: 'ONU' },
    // Manual sort position — lower first — so admins can order the dropdown
    // to match the setup flow (Login prep, then Bridge, then Route, ...).
    Order: { type: Number, default: 0 }
}, {
    timestamps: true
});

modeTopicSchema.index({ DeviceType: 1, Label: 1 }, { unique: true });

module.exports = mongoose.model('ModeTopic', modeTopicSchema);
