const multer = require('multer');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_FILES = 10;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function invalidImage(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGE_FILES },
    fileFilter: (req, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            return callback(invalidImage('Only JPEG, PNG, and WebP images are allowed'));
        }
        callback(null, true);
    }
});

function hasMatchingSignature(file) {
    const bytes = file.buffer;
    if (file.mimetype === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
        const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        return bytes.length >= pngSignature.length && bytes.subarray(0, pngSignature.length).equals(pngSignature);
    }
    if (file.mimetype === 'image/webp') {
        return bytes.length >= 12
            && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
            && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
}

function validateUploadedImages(req, res, next) {
    if ((req.files || []).some((file) => !hasMatchingSignature(file))) {
        return next(invalidImage('Image content does not match its file type'));
    }
    next();
}

module.exports = {
    MAX_IMAGE_FILES,
    MAX_IMAGE_SIZE,
    imageUpload,
    validateUploadedImages,
    hasMatchingSignature
};
