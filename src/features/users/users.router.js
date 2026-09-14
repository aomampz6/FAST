const express = require('express');
const router = express.Router();
const controller = require('./users.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { excelUpload, validateUploadedExcel } = require('../../middleware/excelUpload');
const { validate, createUserSchema, updateUserSchema, statusSchema, importCommitSchema } = require('./users.validation');

router.use(verifyToken, requireRole('admin'));

router.get('/', controller.list);
router.post('/import/preview', excelUpload.single('file'), validateUploadedExcel, controller.importPreview);
router.post('/import/commit', validate(importCommitSchema), controller.importCommit);
router.get('/:id', controller.getOne);
router.post('/', validate(createUserSchema), controller.create);
router.put('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/status', validate(statusSchema), controller.setStatus);

module.exports = router;
