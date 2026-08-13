const express = require('express');
const router = express.Router();
const controller = require('./users.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createUserSchema, updateUserSchema, statusSchema } = require('./users.validation');

router.use(verifyToken, requireRole('admin'));

router.get('/', controller.list);
router.post('/', validate(createUserSchema), controller.create);
router.put('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/status', validate(statusSchema), controller.setStatus);

module.exports = router;
