const ModeTopic = require('./modeTopics.model');

function duplicateError() {
    const err = new Error('มีหัวข้อนี้อยู่แล้วสำหรับประเภทอุปกรณ์นี้');
    err.status = 409;
    return err;
}

async function list() {
    return ModeTopic.find().sort({ DeviceType: 1, Order: 1, Label: 1 });
}

async function create(data) {
    try {
        const topic = new ModeTopic(data);
        return await topic.save();
    } catch (err) {
        if (err.code === 11000) throw duplicateError();
        throw err;
    }
}

async function findOrFail(id) {
    const topic = await ModeTopic.findById(id);
    if (!topic) {
        const err = new Error('Topic not found');
        err.status = 404;
        throw err;
    }
    return topic;
}

async function update(id, data) {
    const topic = await findOrFail(id);
    Object.assign(topic, data);
    try {
        return await topic.save();
    } catch (err) {
        if (err.code === 11000) throw duplicateError();
        throw err;
    }
}

async function remove(id) {
    const topic = await findOrFail(id);
    await topic.deleteOne();
}

module.exports = { list, create, update, remove };
