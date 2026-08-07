const { adminUser, adminPass, nodeEnv } = require('../config/env');
const User = require('../features/auth/auth.model');
const logger = require('../shared/logger');

// Bootstraps the first admin account from ADMIN_USER/ADMIN_PASS so the
// deployment has a real DB-backed admin instead of a hardcoded credential.
// Runs only once: skipped once any admin user already exists in the database.
async function seedAdmin() {
    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) return;

    if (!adminUser || !adminPass) {
        if (nodeEnv === 'production') {
            throw new Error('No admin user exists and ADMIN_USER/ADMIN_PASS are not set — cannot bootstrap admin access');
        }
        logger.warn('No admin user exists and ADMIN_USER/ADMIN_PASS are not set — skipping admin bootstrap');
        return;
    }

    await User.create({ username: adminUser, password: adminPass, role: 'admin' });
    logger.info(`Seeded initial admin user "${adminUser}"`);
}

module.exports = seedAdmin;
