const parametersService = require('./parameters.service');

async function getAll(req, res, next) {
    try {
        const parameters = await parametersService.getAll();
        res.json(parameters);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const parameter = await parametersService.create(req.body);
        res.status(201).json(parameter);
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const parameter = await parametersService.update(req.params.id, req.body);
        res.json(parameter);
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        await parametersService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

module.exports = { getAll, create, update, remove };
