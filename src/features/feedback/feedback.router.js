const express = require('express');
const router = express.Router();
const controller = require('./feedback.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createFeedbackSchema, updateStatusSchema } = require('./feedback.validation');

router.post('/', verifyToken, validate(createFeedbackSchema), controller.create);
router.get('/mine', verifyToken, controller.listMine);
router.get('/', verifyToken, requireRole('admin'), controller.list);
router.patch('/:id/status', verifyToken, requireRole('admin'), validate(updateStatusSchema), controller.updateStatus);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

module.exports = router;
