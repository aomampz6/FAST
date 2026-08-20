const Feedback = require('./feedback.model');
const User = require('../auth/auth.model');

// userId always comes from the verified JWT payload, never from the request
// body, so a client can't submit feedback under someone else's identity.
async function createFeedback(userId, { scope, refId, rating, comment }) {
    const feedback = new Feedback({ userId, scope, refId, rating, comment });
    await feedback.save();
    return feedback;
}

// Feedback.userId is stored as a plain String copy of the JWT's `id` claim
// (not a Mongoose ref), so it can't be `.populate()`d — resolved manually
// against the User collection instead, for the admin feedback list to show
// who submitted each entry rather than a bare id.
async function listFeedback({ scope, refId }) {
    const filter = {};
    if (scope) filter.scope = scope;
    if (refId) filter.refId = refId;
    const feedback = await Feedback.find(filter).sort({ createdAt: -1 }).lean();

    const userIds = [...new Set(feedback.map((f) => f.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select('username fullName');
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    return feedback.map((f) => ({
        ...f,
        username: userMap.get(f.userId)?.username || null,
        fullName: userMap.get(f.userId)?.fullName || null,
    }));
}

// A user's own feedback history — for the "ข้อมูลส่วนตัว" page, so anyone
// can see what they've previously suggested (no admin role required, unlike
// listFeedback, since it's scoped to the caller's own userId).
async function listMyFeedback(userId) {
    return Feedback.find({ userId }).sort({ createdAt: -1 });
}

async function updateStatus(id, status) {
    const feedback = await Feedback.findByIdAndUpdate(id, { status }, { new: true });
    if (!feedback) {
        const err = new Error('Feedback not found');
        err.status = 404;
        throw err;
    }
    return feedback;
}

async function deleteFeedback(id) {
    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) {
        const err = new Error('Feedback not found');
        err.status = 404;
        throw err;
    }
    return feedback;
}

module.exports = { createFeedback, listFeedback, listMyFeedback, updateStatus, deleteFeedback };
