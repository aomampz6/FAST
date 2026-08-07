const express = require('express');
const router = express.Router();
const controller = require('./feedback.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createFeedbackSchema } = require('./feedback.validation');

router.post('/', verifyToken, validate(createFeedbackSchema), controller.create);
router.get('/', verifyToken, requireRole('admin'), controller.list);

module.exports = router;
