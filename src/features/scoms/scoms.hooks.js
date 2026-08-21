const { deleteImage } = require('../../shared/s3');

// Best-effort cleanup — an S3 failure here must never block the DB delete.
async function deleteScomImages(scom) {
    await Promise.all(scom.Images.map(img => deleteImage(img.key).catch(() => {})));
}

module.exports = { deleteScomImages };
