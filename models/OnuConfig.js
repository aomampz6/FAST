const mongoose = require('mongoose');

const onuConfigSchema = new mongoose.Schema({
    Brand: { type: String, required: true },
    Mode: { type: String, required: true },
    Details: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('OnuConfig', onuConfigSchema);
