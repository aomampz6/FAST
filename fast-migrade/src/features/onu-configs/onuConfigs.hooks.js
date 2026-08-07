const { deleteImage } = require('../../shared/s3');

// Best-effort cleanup — an S3 failure here must never block the DB delete.
async function deleteConfigImages(config) {
    await Promise.all(config.Images.map(img => deleteImage(img.key).catch(() => {})));
}

module.exports = { deleteConfigImages };
