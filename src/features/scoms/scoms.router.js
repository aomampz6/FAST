const express = require('express');
const router = express.Router();
const controller = require('./scoms.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, createScomSchema, updateScomSchema } = require('./scoms.validation');
const { imageUpload, validateUploadedImages, MAX_IMAGE_FILES } = require('../../middleware/imageUpload');

router.get('/image', controller.getImage);

router.get('/', verifyToken, controller.getAll);
router.post('/', verifyToken, requireRole('admin'), validate(createScomSchema), controller.create);
router.put('/:id', verifyToken, requireRole('admin'), validate(updateScomSchema), controller.update);
router.delete('/:id', verifyToken, requireRole('admin'), controller.remove);

router.post(
    '/:id/images',
    verifyToken,
    requireRole('admin'),
    imageUpload.array('images', MAX_IMAGE_FILES),
    validateUploadedImages,
    controller.addImages
);
router.delete('/:id/images/:imageId', verifyToken, requireRole('admin'), controller.removeImage);

module.exports = router;
