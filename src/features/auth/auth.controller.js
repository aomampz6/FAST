const authService = require('./auth.service');

async function login(req, res, next) {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        res.json({ ...result, message: 'Login successful' });
    } catch (err) {
        next(err);
    }
}

async function register(req, res, next) {
    try {
        await authService.register(req.body);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        next(err);
    }
}

async function me(req, res, next) {
    try {
        const profile = await authService.getProfile(req.user.id);
        res.json(profile);
    } catch (err) {
        next(err);
    }
}

module.exports = { login, register, me };
