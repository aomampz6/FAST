const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    scope: { type: String, enum: ['troubleshoot', 'onu-setup'], required: true },
    refId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
