const mongoose = require('mongoose');

const onuConfigImageSchema = new mongoose.Schema({
    key: { type: String, required: true },
    originalName: { type: String }
}, {
    timestamps: true
});

const onuConfigSchema = new mongoose.Schema({
    Brand: { type: String, required: true },
    Mode: { type: String, required: true },
    Details: { type: String, required: true },
    Hidden: { type: Boolean, default: false },
    Images: { type: [onuConfigImageSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('OnuConfig', onuConfigSchema);
