const Scom = require('./scoms.model');
const { deleteScomImages } = require('./scoms.hooks');
const { uploadImage, deleteImage } = require('../../shared/s3');

async function getAll(role) {
    const filter = role === 'admin' ? {} : { hidden: { $ne: true } };
    return Scom.find(filter).sort({ ID: 1 });
}

async function create(data) {
    const scom = new Scom(data);
    await scom.save();
    return scom;
}

async function findOrFail(id) {
    const scom = await Scom.findById(id);
    if (!scom) {
        const err = new Error('Scom not found');
        err.status = 404;
        throw err;
    }
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
    const scom = await findOrFail(id);
    await deleteScomImages(scom);
    await scom.deleteOne();
}

async function addImages(id, files) {
    const scom = await findOrFail(id);
    for (const file of files) {
        const key = `scoms/${scom._id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await uploadImage(key, file.buffer, file.mimetype);
        scom.Images.push({ key, originalName: file.originalname });
    }
    return scom.save();
}

async function removeImage(id, imageId) {
    const scom = await findOrFail(id);
    const image = scom.Images.id(imageId);
    if (!image) {
        const err = new Error('Image not found');
        err.status = 404;
        throw err;
    }

    await deleteImage(image.key).catch(() => {});
    scom.Images.pull(imageId);
    return scom.save();
}

module.exports = { getAll, create, update, remove, addImages, removeImage };
