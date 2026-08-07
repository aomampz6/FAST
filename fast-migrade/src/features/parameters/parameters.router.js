const express = require('express');
const router = express.Router();
const controller = require('./parameters.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, parameterSchema, updateParameterSchema } = require('./parameters.validation');

router.get('/', verifyToken, controller.getAll);
router.post('/', verifyToken, requireRole('admin'), validate(parameterSchema), controller.create);
router.put('/:id', verifyToken, requireRole('admin'), validate(updateParameterSchema), controller.update);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

module.exports = router;
