const rateLimit = require('express-rate-limit');

// Limits brute-force credential guessing against the login endpoint.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts, please try again later' }
});

module.exports = { loginLimiter };
