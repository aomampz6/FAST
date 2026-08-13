const logger = require('../../shared/logger');

// Domain hooks for the auth feature — kept separate from auth.service.js so
// business logic (deciding whether login succeeds) isn't mixed with
// side-effects (audit logging).
function onLoginSuccess(user) {
    logger.info('login_success', { userId: user._id.toString(), role: user.role });
}

function onLoginFailure(username) {
    logger.warn('login_failure', { username });
}

module.exports = { onLoginSuccess, onLoginFailure };
