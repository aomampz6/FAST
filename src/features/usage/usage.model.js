const mongoose = require('mongoose');

// How long raw usage events are kept before MongoDB's TTL monitor removes
// them. The admin stats page looks back at most 90 days, so a year leaves
// plenty of history for ad-hoc queries without the collection growing forever.
const RETENTION_DAYS = 365;

// One row per thing worth counting: a successful login (written from
// auth.hooks onLoginSuccess) or a page opened in the app (sent by the
// frontend's UsageTracker on every route change).
const usageEventSchema = new mongoose.Schema({
    // Plain String copy of the JWT `id`, same convention as Feedback.userId.
    userId: { type: String, required: true },
    type: { type: String, enum: ['login', 'page_view'], required: true },
    // Only set for page_view — the route pathname, no query string.
    path: { type: String },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

usageEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });
usageEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('UsageEvent', usageEventSchema);
