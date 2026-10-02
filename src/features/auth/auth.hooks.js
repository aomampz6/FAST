const logger = require('../../shared/logger');
const { recordLogin } = require('../usage/usage.service');

// Domain hooks for the auth feature — kept separate from auth.service.js so
// business logic (deciding whether login succeeds) isn't mixed with
// side-effects (audit logging).
function onLoginSuccess(user) {
    const userId = user._id.toString();
    logger.info('login_success', { userId, role: user.role });
    // Fire-and-forget: a failed stats write must never block someone from
    // logging in, so it is only logged, not awaited or rethrown.
    recordLogin(userId).catch((err) => logger.error('usage_record_login_failed', { userId, error: err.message }));
}

function onLoginFailure(username) {
    logger.warn('login_failure', { username });
}

module.exports = { onLoginSuccess, onLoginFailure };
