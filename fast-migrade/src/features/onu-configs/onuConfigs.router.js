const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('./onuConfigs.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createSchema, updateSchema } = require('./onuConfigs.validation');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 50 }
});

router.get('/image', controller.getImage);

router.get('/', verifyToken, controller.list);
router.post('/', verifyToken, requireRole('admin'), validate(createSchema), controller.create);
router.put('/:id', verifyToken, requireRole('admin'), validate(updateSchema), controller.update);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

router.post('/:id/images', verifyToken, requireRole('admin'), upload.array('images', 50), controller.addImages);
router.delete('/:id/images/:imageId', verifyToken, requireRole('admin'), controller.removeImage);

module.exports = router;
