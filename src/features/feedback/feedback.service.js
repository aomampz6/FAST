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

// A user's own feedback — shown on the page they commented on (filtered by
// scope + refId) together with the admin's reply and status. No admin role
// required, unlike listFeedback, since it's always scoped to the caller's
// own userId.
async function listMyFeedback(userId, { scope, refId } = {}) {
    const filter = { userId };
    if (scope) filter.scope = scope;
    if (refId) filter.refId = refId;
    return Feedback.find(filter).sort({ createdAt: -1 });
}

// Everyone's feedback on ONE topic (scope + refId), for the user-facing page:
// any logged-in user can read what colleagues suggested there and how admins
// replied. Deliberately returns a trimmed shape — only the display name, and
// `mine` for the caller's own rows — never userId/username of other people.
async function listTopicFeedback(userId, { scope, refId }) {
    const feedback = await Feedback.find({ scope, refId }).sort({ createdAt: -1 }).lean();

    const userIds = [...new Set(feedback.map((f) => f.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select('fullName username');
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    return feedback.map((f) => ({
        _id: f._id,
        scope: f.scope,
        refId: f.refId,
        rating: f.rating,
        comment: f.comment,
        status: f.status,
        adminComment: f.adminComment || '',
        adminCommentAt: f.adminCommentAt || null,
        createdAt: f.createdAt,
        authorName: userMap.get(f.userId)?.fullName || userMap.get(f.userId)?.username || null,
        mine: f.userId === String(userId),
    }));
}

async function updateReply(id, adminComment) {
    const feedback = await Feedback.findByIdAndUpdate(
        id,
        { adminComment, adminCommentAt: adminComment ? new Date() : null },
        { new: true }
    );
    if (!feedback) {
        const err = new Error('Feedback not found');
        err.status = 404;
        throw err;
    }
    return feedback;
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

module.exports = { createFeedback, listFeedback, listMyFeedback, listTopicFeedback, updateReply, updateStatus, deleteFeedback };
