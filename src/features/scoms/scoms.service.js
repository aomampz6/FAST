const Scom = require('./scoms.model');

async function getAll(role) {
    const filter = role === 'admin' ? {} : { hidden: { $ne: true } };
    return Scom.find(filter).sort({ ID: 1 });
}

async function create(data) {
    const scom = new Scom(data);
    await scom.save();
    return scom;
}

async function update(id, data) {
    const scom = await Scom.findByIdAndUpdate(id, data, { new: true });
    if (!scom) {
        const err = new Error('Scom not found');
        err.status = 404;
        throw err;
    }
    return scom;
}

async function remove(id) {
    const scom = await Scom.findByIdAndDelete(id);
    if (!scom) {
        const err = new Error('Scom not found');
        err.status = 404;
        throw err;
    }
    return scom;
}

module.exports = { getAll, create, update, remove };
