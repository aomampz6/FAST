const feedbackService = require('./feedback.service');

async function create(req, res, next) {
    try {
        const feedback = await feedbackService.createFeedback(req.user.id, req.body);
        res.status(201).json(feedback);
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const { scope, refId } = req.query;
        const feedback = await feedbackService.listFeedback({ scope, refId });
        res.json(feedback);
    } catch (err) {
        next(err);
    }
}

module.exports = { create, list };
