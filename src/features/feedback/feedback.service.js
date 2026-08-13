const Feedback = require('./feedback.model');

// userId always comes from the verified JWT payload, never from the request
// body, so a client can't submit feedback under someone else's identity.
async function createFeedback(userId, { scope, refId, rating, comment }) {
    const feedback = new Feedback({ userId, scope, refId, rating, comment });
    await feedback.save();
    return feedback;
}

async function listFeedback({ scope, refId }) {
    const filter = {};
    if (scope) filter.scope = scope;
    if (refId) filter.refId = refId;
    return Feedback.find(filter).sort({ createdAt: -1 });
}

module.exports = { createFeedback, listFeedback };
