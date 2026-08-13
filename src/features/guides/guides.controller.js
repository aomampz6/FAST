const guidesService = require('./guides.service');

function listGuides(req, res, next) {
    try {
        const guides = guidesService.listGuides();
        res.json(guides);
    } catch (err) {
        next(err);
    }
}

function readGuide(req, res, next) {
    try {
        const guide = guidesService.readGuide(req.params.filename);
        res.json(guide);
    } catch (err) {
        next(err);
    }
}

function writeGuide(req, res, next) {
    try {
        guidesService.writeGuide(req.params.filename, req.body.content);
        res.json({ message: 'Saved successfully' });
    } catch (err) {
        next(err);
    }
}

module.exports = { listGuides, readGuide, writeGuide };
