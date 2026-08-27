const express = require('express');
const router = express.Router();
const controller = require('./modeTopics.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createSchema, updateSchema } = require('./modeTopics.validation');

router.get('/', verifyToken, controller.list);
router.post('/', verifyToken, requireRole('admin'), validate(createSchema), controller.create);
router.put('/:id', verifyToken, requireRole('admin'), validate(updateSchema), controller.update);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

module.exports = router;
