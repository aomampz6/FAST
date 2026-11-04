const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    scope: { type: String, enum: ['troubleshoot', 'onu-setup', 'ata-setup', 'ap-setup'], required: true },
    refId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false },
    // Admin triage: 'new' until an admin has acted on the suggestion and
    // marks it resolved from the admin feedback tab.
    // Admin's answer to the suggestion, shown back to the user who wrote it
    // on the page they commented on. Empty string = no reply yet.
    adminComment: { type: String, default: '' },
    adminCommentAt: { type: Date, default: null },
    status: { type: String, enum: ['new', 'resolved'], default: 'new' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
