const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const User = require('./auth.model');
const { onLoginSuccess, onLoginFailure } = require('./auth.hooks');

/**
 * Resolves what the user typed into the login box to a single account.
 *
 * Technicians know themselves by two things: the username derived from their
 * e-mail (somchai.p) and their รหัสพนักงาน (12345678), so either one is
 * accepted here.
 *
 * username always wins over empId. The two namespaces are not guaranteed to be
 * disjoint, and if someone's employee id happened to equal another person's
 * username, matching the username first keeps that account reachable by its
 * owner instead of being shadowed.
 *
 * empId carries no unique index — the HR import has never enforced one — so a
 * duplicated employee id is possible. Authenticating one of several candidates
 * would be a guess about whose account is being opened, so an ambiguous empId
 * is refused outright rather than resolved arbitrarily.
 */
async function findByIdentifier(identifier) {
    const trimmed = String(identifier || '').trim();
    if (!trimmed) return null;

    const byUsername = await User.findOne({ username: trimmed });
    if (byUsername) return byUsername;

    // Limited to 2: one match is usable, and anything beyond the second tells
    // us nothing more than "ambiguous".
    const byEmpId = await User.find({ empId: { $in: empIdVariants(trimmed) } }).limit(2);
    return byEmpId.length === 1 ? byEmpId[0] : null;
}

// The roster stores รหัสพนักงาน exactly as the HR export spelled it, while the
// import derives the default password by zero-padding it to 8 digits — so
// people have seen their id both ways and will type either. Match on any
// numerically-equal spelling; two accounts whose ids differ only in leading
// zeros come back as an ambiguous pair and are refused above, so widening the
// query cannot hand anyone someone else's account.
function empIdVariants(value) {
    if (!/^\d+$/.test(value)) return [value];
    const stripped = value.replace(/^0+(?=\d)/, '');
    return [...new Set([value, stripped, stripped.padStart(8, '0')])];
}

async function login(username, password) {
    const user = await findByIdentifier(username);
    if (!user || !(await user.comparePassword(password))) {
        onLoginFailure(username);
        const err = new Error('Invalid credentials');
        err.status = 401;
        throw err;
    }

    if (!user.isActive) {
        onLoginFailure(username);
        const err = new Error('Account suspended');
        err.status = 403;
        throw err;
    }

    onLoginSuccess(user);
    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '8h' });
    return { token, role: user.role };
}

async function getProfile(userId) {
    // Explicit whitelist rather than `-password`: everything listed here is
    // shown on the profile page, and nothing else about the account leaks to
    // the browser.
    const user = await User.findById(userId).select(
        'username fullName role empId firstName lastName deptName deptFullName email'
    );
    if (!user) {
        const err = new Error('User not found');
        err.status = 404;
        throw err;
    }
    return user;
}

async function register({ username, password, role, fullName }) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        const err = new Error('Username already exists');
        err.status = 400;
        throw err;
    }

    const user = new User({ username, password, role: role || 'user', fullName });
    await user.save();
    return user;
}

module.exports = { login, register, getProfile, findByIdentifier };
