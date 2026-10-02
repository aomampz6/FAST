const usageService = require('./usage.service');
const { parseDays } = require('./usage.validation');

// userId comes from the verified JWT, never the body, so nobody can log
// page views under someone else's account.
async function pageView(req, res, next) {
    try {
        await usageService.recordPageView(req.user.id, req.body.path);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

async function stats(req, res, next) {
    try {
        const result = await usageService.getStats(parseDays(req.query.days));
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = { pageView, stats };
