const scomsService = require('./scoms.service');

async function getAll(req, res, next) {
    try {
        const scoms = await scomsService.getAll();
        res.json(scoms);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const scom = await scomsService.create(req.body);
        res.status(201).json(scom);
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const scom = await scomsService.update(req.params.id, req.body);
        res.json(scom);
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        await scomsService.remove(req.params.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

module.exports = { getAll, create, update, remove };
