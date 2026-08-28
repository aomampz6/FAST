const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const User = require('../features/auth/auth.model');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token.split(' ')[1], jwtSecret, async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const user = await User.findById(decoded.id).select('role isActive');
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            req.user = { id: String(user._id), role: user.role };
            next();
        } catch (dbError) {
            next(dbError);
        }
    });
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
};

module.exports = { verifyToken, requireRole };
