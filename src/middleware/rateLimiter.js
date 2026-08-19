const rateLimit = require('express-rate-limit');

// A single IPv6 client is routinely handed a whole /64 and can rotate freely
// inside it, so collapse addresses to that prefix before using them as part of
// a rate-limit key. IPv4 addresses are used as-is.
function normalizeIp(ip) {
    const address = String(ip || '').replace(/^::ffff:/, '');
    if (!address.includes(':')) return address;
    return address.split(':').slice(0, 4).join(':');
}

// Limits brute-force credential guessing against the login endpoint.
//
// Keyed on the attacked *username* rather than the client IP alone, with
// successful logins excluded from the count. With ~2,400 technician accounts an
// IP-keyed counter punishes the wrong thing: a whole NT office behind one NAT
// address would share a single 10-request budget. Guessing passwords means
// hammering one account, so counting failures per account stops that without
// ever blocking people who type their password correctly.
//
// The IP stays in the key so one person cannot lock a colleague out of their
// own account by deliberately failing logins against it.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${normalizeIp(req.ip)}:${String(req.body?.username || '').toLowerCase()}`,
    message: { message: 'Too many login attempts, please try again later' }
});

module.exports = { loginLimiter, normalizeIp };
