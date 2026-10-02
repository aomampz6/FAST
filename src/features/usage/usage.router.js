const express = require('express');
const router = express.Router();
const controller = require('./usage.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, pageViewSchema } = require('./usage.validation');

router.post('/page-view', verifyToken, validate(pageViewSchema), controller.pageView);
router.get('/stats', verifyToken, requireRole('admin'), controller.stats);

module.exports = router;
