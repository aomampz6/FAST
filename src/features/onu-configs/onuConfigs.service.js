const OnuConfig = require('./onuConfigs.model');
const { deleteConfigImages } = require('./onuConfigs.hooks');
const { uploadImage, deleteImage } = require('../../shared/s3');

async function list() {
    return OnuConfig.find().sort({ Brand: 1, Mode: 1 });
}

async function create(data) {
    const config = new OnuConfig(data);
    return config.save();
}

async function findOrFail(id) {
    const config = await OnuConfig.findById(id);
    if (!config) {
        const err = new Error('Config not found');
        err.status = 404;
        throw err;
    }
    return config;
}

async function update(id, data) {
    const config = await findOrFail(id);
    Object.assign(config, data);
    return config.save();
}

async function remove(id) {
    const config = await findOrFail(id);
    await deleteConfigImages(config);
    await config.deleteOne();
}

async function addImages(id, files) {
    const config = await findOrFail(id);
    for (const file of files) {
        const key = `onu-configs/${config._id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await uploadImage(key, file.buffer, file.mimetype);
        config.Images.push({ key, originalName: file.originalname });
    }
    return config.save();
}

async function removeImage(id, imageId) {
    const config = await findOrFail(id);
    const image = config.Images.id(imageId);
    if (!image) {
        const err = new Error('Image not found');
        err.status = 404;
        throw err;
    }

    await deleteImage(image.key).catch(() => {});
    config.Images.pull(imageId);
    return config.save();
}

module.exports = { list, create, update, remove, addImages, removeImage };
