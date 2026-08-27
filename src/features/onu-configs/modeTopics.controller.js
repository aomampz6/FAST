const service = require('./modeTopics.service');

async function list(req, res, next) {
    try {
        const topics = await service.list();
        res.json(topics);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const topic = await service.create(req.body);
        res.status(201).json(topic);
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const topic = await service.update(req.params.id, req.body);
        res.json(topic);
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        await service.remove(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
}

module.exports = { list, create, update, remove };
