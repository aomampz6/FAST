const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET = process.env.S3_BUCKET;

async function uploadImage(key, buffer, contentType) {
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
}

async function deleteImage(key) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function getImageObject(key) {
    return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadImage, deleteImage, getImageObject };
