const express = require('express');
const router = express.Router();
const controller = require('./scoms.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createScomSchema, updateScomSchema } = require('./scoms.validation');

router.get('/', verifyToken, controller.getAll);
router.post('/', verifyToken, requireRole('admin'), validate(createScomSchema), controller.create);
router.put('/:id', verifyToken, requireRole('admin'), validate(updateScomSchema), controller.update);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

module.exports = router;
