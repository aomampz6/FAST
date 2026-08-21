const scomsService = require('./scoms.service');
const { getImageObject } = require('../../shared/s3');

async function getAll(req, res, next) {
    try {
        const scoms = await scomsService.getAll(req.user.role);
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

async function addImages(req, res, next) {
    try {
        const scom = await scomsService.addImages(req.params.id, req.files || []);
        res.status(201).json(scom);
    } catch (err) {
        next(err);
    }
}

async function removeImage(req, res, next) {
    try {
        const scom = await scomsService.removeImage(req.params.id, req.params.imageId);
        res.json(scom);
    } catch (err) {
        next(err);
    }
}

// Unauthenticated (like a static assets folder) so plain <img> tags embedded
// in Steps' rich text content can load it directly.
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

module.exports = { getAll, create, update, remove, addImages, removeImage, getImage };
