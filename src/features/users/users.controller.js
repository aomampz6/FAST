const usersService = require('./users.service');

function toSafeUser(user) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
}

function parseIsActive(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

async function list(req, res, next) {
    try {
        const result = await usersService.list({
            search: req.query.search || '',
            page: req.query.page,
            limit: req.query.limit,
            role: req.query.role,
            isActive: parseIsActive(req.query.isActive)
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const user = await usersService.create(req.body);
        res.status(201).json(toSafeUser(user));
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const user = await usersService.update(req.params.id, req.body);
        res.json(toSafeUser(user));
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        await usersService.remove(req.params.id, req.user.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

async function setStatus(req, res, next) {
    try {
        const user = await usersService.setActive(req.params.id, req.body.isActive, req.user.id);
        res.json(toSafeUser(user));
    } catch (err) {
        next(err);
    }
}

module.exports = { list, create, update, remove, setStatus };
