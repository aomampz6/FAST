const Parameter = require('./parameters.model');

async function getAll() {
    return Parameter.find().sort({ createdAt: 1 });
}

async function create(data) {
    const parameter = new Parameter(data);
    return parameter.save();
}

async function update(id, data) {
    const parameter = await Parameter.findByIdAndUpdate(id, data, { new: true });
    if (!parameter) {
        const err = new Error('Parameter not found');
        err.status = 404;
        throw err;
    }
    return parameter;
}

async function remove(id) {
    const parameter = await Parameter.findByIdAndDelete(id);
    if (!parameter) {
        const err = new Error('Parameter not found');
        err.status = 404;
        throw err;
    }
    return parameter;
}

module.exports = { getAll, create, update, remove };
