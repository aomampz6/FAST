const PhonebookGroup = require('./phonebook.model');

async function getAllGroups() {
    return PhonebookGroup.find();
}

async function createGroup(data) {
    const group = new PhonebookGroup({ ...data, contacts: [] });
    await group.save();
    return group;
}

async function updateGroup(groupId, data) {
    const group = await PhonebookGroup.findById(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.status = 404;
        throw err;
    }
    Object.assign(group, data);
    await group.save();
    return group;
}

async function deleteGroup(groupId) {
    const group = await PhonebookGroup.findByIdAndDelete(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.status = 404;
        throw err;
    }
    return group;
}

async function addContact(groupId, data) {
    const group = await PhonebookGroup.findById(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.status = 404;
        throw err;
    }
    group.contacts.push(data);
    await group.save();
    return group;
}

async function updateContact(groupId, contactId, data) {
    const group = await PhonebookGroup.findById(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.status = 404;
        throw err;
    }
    const contact = group.contacts.id(contactId);
    if (!contact) {
        const err = new Error('Contact not found');
        err.status = 404;
        throw err;
    }
    Object.assign(contact, data);
    await group.save();
    return group;
}

async function deleteContact(groupId, contactId) {
    const group = await PhonebookGroup.findById(groupId);
    if (!group) {
        const err = new Error('Group not found');
        err.status = 404;
        throw err;
    }
    const contact = group.contacts.id(contactId);
    if (!contact) {
        const err = new Error('Contact not found');
        err.status = 404;
        throw err;
    }
    contact.deleteOne();
    await group.save();
    return group;
}

module.exports = { getAllGroups, createGroup, updateGroup, deleteGroup, addContact, updateContact, deleteContact };
