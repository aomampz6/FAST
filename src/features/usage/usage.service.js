const UsageEvent = require('./usage.model');
const User = require('../auth/auth.model');

// Every technician works in Thailand, so "a day" on the stats page means a
// Bangkok calendar day — bucketing in UTC would split each morning shift
// across two bars.
const TIME_ZONE = 'Asia/Bangkok';
const UTC_OFFSET = '+07:00';

// YYYY-MM-DD in Bangkok time ('en-CA' formats dates that way).
function dayKey(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

async function recordLogin(userId) {
    await UsageEvent.create({ userId, type: 'login' });
}

async function recordPageView(userId, path) {
    await UsageEvent.create({ userId, type: 'page_view', path });
}

// UsageEvent.userId is a plain String (like Feedback.userId), so names are
// resolved by hand against the User collection.
async function loadUserMap(userIds) {
    const users = await User.find({ _id: { $in: userIds } }).select('username fullName deptName');
    return new Map(users.map((u) => [String(u._id), u]));
}

function withUser(userMap, userId) {
    const user = userMap.get(userId);
    return {
        userId,
        username: user?.username || null,
        fullName: user?.fullName || null,
        deptName: user?.deptName || null,
    };
}

/**
 * Everything the admin "สถิติการเข้าใช้งาน" tab shows for the last `days`
 * Bangkok days (today included), in one round trip.
 *
 * Active users counts anyone with a login *or* a page view that day: a JWT
 * lasts 8h, so a technician who logged in yesterday evening and keeps
 * working this morning has no login today but is clearly using the system.
 */
async function getStats(days) {
    const now = new Date();
    const keys = [];
    for (let i = days - 1; i >= 0; i--) {
        keys.push(dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
    }
    const since = new Date(`${keys[0]}T00:00:00${UTC_OFFSET}`);

    const [result] = await UsageEvent.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $facet: {
                daily: [
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIME_ZONE } },
                            logins: { $sum: { $cond: [{ $eq: ['$type', 'login'] }, 1, 0] } },
                            pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
                            users: { $addToSet: '$userId' },
                        },
                    },
                    { $project: { logins: 1, pageViews: 1, activeUsers: { $size: '$users' } } },
                ],
                totals: [
                    {
                        $group: {
                            _id: null,
                            logins: { $sum: { $cond: [{ $eq: ['$type', 'login'] }, 1, 0] } },
                            pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
                            users: { $addToSet: '$userId' },
                        },
                    },
                    { $project: { logins: 1, pageViews: 1, activeUsers: { $size: '$users' } } },
                ],
                topPages: [
                    { $match: { type: 'page_view' } },
                    {
                        $group: {
                            _id: '$path',
                            views: { $sum: 1 },
                            users: { $addToSet: '$userId' },
                        },
                    },
                    { $project: { views: 1, users: { $size: '$users' } } },
                    { $sort: { views: -1 } },
                    { $limit: 10 },
                ],
                topUsers: [
                    {
                        $group: {
                            _id: '$userId',
                            logins: { $sum: { $cond: [{ $eq: ['$type', 'login'] }, 1, 0] } },
                            pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
                            lastSeen: { $max: '$createdAt' },
                        },
                    },
                    { $sort: { pageViews: -1, logins: -1 } },
                    { $limit: 10 },
                ],
            },
        },
    ]);

    const recentLogins = await UsageEvent.find({ type: 'login' }).sort({ createdAt: -1 }).limit(20).lean();
    const totalUsers = await User.countDocuments({ isActive: true });

    const userMap = await loadUserMap([
        ...new Set([...result.topUsers.map((u) => u._id), ...recentLogins.map((l) => l.userId)]),
    ]);

    // Days with no events at all are missing from the aggregation — fill
    // them with zeros so the chart shows a gap instead of skipping the date.
    const dailyByKey = new Map(result.daily.map((d) => [d._id, d]));
    const totals = result.totals[0] || { logins: 0, pageViews: 0, activeUsers: 0 };

    return {
        days,
        totals: {
            logins: totals.logins,
            pageViews: totals.pageViews,
            activeUsers: totals.activeUsers,
            totalUsers,
        },
        daily: keys.map((date) => {
            const d = dailyByKey.get(date);
            return {
                date,
                logins: d?.logins || 0,
                pageViews: d?.pageViews || 0,
                activeUsers: d?.activeUsers || 0,
            };
        }),
        topPages: result.topPages.map((p) => ({ path: p._id, views: p.views, users: p.users })),
        topUsers: result.topUsers.map((u) => ({
            ...withUser(userMap, u._id),
            logins: u.logins,
            pageViews: u.pageViews,
            lastSeen: u.lastSeen,
        })),
        recentLogins: recentLogins.map((l) => ({ ...withUser(userMap, l.userId), createdAt: l.createdAt })),
    };
}

module.exports = { recordLogin, recordPageView, getStats };
