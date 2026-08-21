const mongoose = require('mongoose');

const onuConfigImageSchema = new mongoose.Schema({
    key: { type: String, required: true },
    originalName: { type: String }
}, {
    timestamps: true
});

const onuConfigSchema = new mongoose.Schema({
    Brand: { type: String, required: true },
    // Device model (รุ่น) — optional because records created before this
    // field existed have none, and some brands only ever ship one model.
    Model: { type: String, default: '' },
    Mode: { type: String, required: true },
    Details: { type: String, required: true },
    Hidden: { type: Boolean, default: false },
    DeviceType: { type: String, enum: ['ONU', 'ATA'], default: 'ONU' },
    Images: { type: [onuConfigImageSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('OnuConfig', onuConfigSchema);
