const service = require('./onuConfigs.service');
const { getImageObject } = require('../../shared/s3');

async function list(req, res, next) {
    try {
        const configs = await service.list();
        res.json(configs);
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const config = await service.create(req.body);
        res.status(201).json(config);
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const config = await service.update(req.params.id, req.body);
        res.json(config);
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

async function addImages(req, res, next) {
    try {
        const config = await service.addImages(req.params.id, req.files || []);
        res.status(201).json(config);
    } catch (err) {
        next(err);
    }
}

async function removeImage(req, res, next) {
    try {
        const config = await service.removeImage(req.params.id, req.params.imageId);
        res.json(config);
    } catch (err) {
        next(err);
    }
}

// Unauthenticated (like a static assets folder) so plain <img> tags can load it
// directly — these are instructional screenshots, not sensitive data.
async function getImage(req, res) {
    try {
        const key = req.query.key;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const obj = await getImageObject(key);
        res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        obj.Body.pipe(res);
    } catch (err) {
        res.status(404).json({ message: 'Image not found' });
    }
}

module.exports = { list, create, update, remove, addImages, removeImage, getImage };
