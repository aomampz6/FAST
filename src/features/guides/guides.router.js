const express = require('express');
const router = express.Router();
const controller = require('./guides.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, updateGuideSchema } = require('./guides.validation');

router.get('/', verifyToken, controller.listGuides);
router.get('/:filename', verifyToken, controller.readGuide);
router.put('/:filename', verifyToken, requireRole('admin'), validate(updateGuideSchema), controller.writeGuide);

module.exports = router;
