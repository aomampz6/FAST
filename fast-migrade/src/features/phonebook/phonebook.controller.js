const phonebookService = require('./phonebook.service');

async function getAllGroups(req, res, next) {
    try {
        const groups = await phonebookService.getAllGroups();
        res.json(groups);
    } catch (err) {
        next(err);
    }
}

async function createGroup(req, res, next) {
    try {
        const group = await phonebookService.createGroup(req.body);
        res.status(201).json(group);
    } catch (err) {
        next(err);
    }
}

async function updateGroup(req, res, next) {
    try {
        const group = await phonebookService.updateGroup(req.params.groupId, req.body);
        res.json(group);
    } catch (err) {
        next(err);
    }
}

async function deleteGroup(req, res, next) {
    try {
        await phonebookService.deleteGroup(req.params.groupId);
        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        next(err);
    }
}

async function addContact(req, res, next) {
    try {
        const group = await phonebookService.addContact(req.params.groupId, req.body);
        res.status(201).json(group);
    } catch (err) {
        next(err);
    }
}

async function updateContact(req, res, next) {
    try {
        const group = await phonebookService.updateContact(req.params.groupId, req.params.contactId, req.body);
        res.json(group);
    } catch (err) {
        next(err);
    }
}

async function deleteContact(req, res, next) {
    try {
        const group = await phonebookService.deleteContact(req.params.groupId, req.params.contactId);
        res.json(group);
    } catch (err) {
        next(err);
    }
}

module.exports = { getAllGroups, createGroup, updateGroup, deleteGroup, addContact, updateContact, deleteContact };
