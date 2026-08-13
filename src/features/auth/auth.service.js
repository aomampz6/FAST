const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const User = require('./auth.model');
const { onLoginSuccess, onLoginFailure } = require('./auth.hooks');

async function login(username, password) {
    const user = await User.findOne({ username });
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

module.exports = { login, register };
