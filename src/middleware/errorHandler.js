const multer = require('multer');

// Centralized error handler. Feature controllers call next(err) instead of
// each writing its own try/catch res.status(500) block.
function errorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        const limitErrors = new Set(['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE']);
        const status = limitErrors.has(err.code) ? 413 : 400;
        return res.status(status).json({ message: status === 413 ? 'Image upload limit exceeded' : 'Invalid upload' });
    }

    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
