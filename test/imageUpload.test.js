const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const {
    MAX_IMAGE_FILES,
    imageUpload,
    validateUploadedImages
} = require('../src/middleware/imageUpload');
const errorHandler = require('../src/middleware/errorHandler');

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.from('RIFF0000WEBP', 'ascii');

async function withUploadServer(run) {
    const app = express();
    app.post('/upload', imageUpload.array('images', MAX_IMAGE_FILES), validateUploadedImages, (req, res) => {
        res.json({ count: req.files.length });
    });
    app.use(errorHandler);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
        return await run(`http://127.0.0.1:${port}/upload`);
    } finally {
        await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
}

function appendFile(form, bytes, type, name = 'image') {
    form.append('images', new Blob([bytes], { type }), name);
}

test('accepts JPEG, PNG, and WebP files with matching signatures', async () => {
    await withUploadServer(async (url) => {
        const form = new FormData();
        appendFile(form, JPEG, 'image/jpeg', 'photo.jpg');
        appendFile(form, PNG, 'image/png', 'diagram.png');
        appendFile(form, WEBP, 'image/webp', 'screen.webp');

        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { count: 3 });
    });
});

test('rejects unsupported image MIME types', async () => {
    await withUploadServer(async (url) => {
        const form = new FormData();
        appendFile(form, Buffer.from('GIF89a'), 'image/gif', 'animation.gif');

        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 400);
    });
});

test('rejects a forged image MIME type when the signature does not match', async () => {
    await withUploadServer(async (url) => {
        const form = new FormData();
        appendFile(form, Buffer.from('<script>bad</script>'), 'image/png', 'fake.png');

        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 400);
    });
});

test('rejects a file larger than 5 MB', async () => {
    await withUploadServer(async (url) => {
        const oversized = Buffer.alloc((5 * 1024 * 1024) + 1);
        JPEG.copy(oversized);
        const form = new FormData();
        appendFile(form, oversized, 'image/jpeg', 'large.jpg');

        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 413);
    });
});

test('rejects more than 10 files in one request', async () => {
    await withUploadServer(async (url) => {
        const form = new FormData();
        for (let index = 0; index <= MAX_IMAGE_FILES; index += 1) {
            appendFile(form, JPEG, 'image/jpeg', `photo-${index}.jpg`);
        }

        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 413);
    });
});
