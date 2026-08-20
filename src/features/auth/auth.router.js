const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rateLimiter');
const { validate, loginSchema, registerSchema } = require('./auth.validation');

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/register', verifyToken, requireRole('admin'), validate(registerSchema), controller.register);
router.get('/me', verifyToken, controller.me);

module.exports = router;
