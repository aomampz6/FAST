const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    scope: { type: String, enum: ['troubleshoot', 'onu-setup', 'ata-setup'], required: true },
    refId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false },
    // Admin triage: 'new' until an admin has acted on the suggestion and
    // marks it resolved from the admin feedback tab.
    status: { type: String, enum: ['new', 'resolved'], default: 'new' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
