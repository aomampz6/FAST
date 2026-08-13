// Centralized error handler. Feature controllers call next(err) instead of
// each writing its own try/catch res.status(500) block.
function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
