const express = require('express');
const router = express.Router();
const controller = require('./phonebook.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate, groupSchema, groupUpdateSchema, contactSchema, contactUpdateSchema } = require('./phonebook.validation');

router.get('/', verifyToken, controller.getAllGroups);
router.post('/', verifyToken, requireRole('admin'), validate(groupSchema), controller.createGroup);
router.put('/:groupId', verifyToken, requireRole('admin'), validate(groupUpdateSchema), controller.updateGroup);
router.delete('/:groupId', verifyToken, requireRole('admin'), controller.deleteGroup);
router.post('/:groupId/contacts', verifyToken, requireRole('admin'), validate(contactSchema), controller.addContact);
router.put('/:groupId/contacts/:contactId', verifyToken, requireRole('admin'), validate(contactUpdateSchema), controller.updateContact);
router.delete('/:groupId/contacts/:contactId', verifyToken, requireRole('admin'), controller.deleteContact);

module.exports = router;
