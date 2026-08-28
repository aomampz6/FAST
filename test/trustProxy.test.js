const assert = require('node:assert/strict');
const http = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const express = require('express');
const { parseTrustProxy } = require('../src/config/trustProxy');

async function requestIp(trustProxy, forwardedFor) {
    const app = express();
    app.set('trust proxy', trustProxy);
    app.get('/', (req, res) => res.json({ ip: req.ip }));

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
            headers: { 'x-forwarded-for': forwardedFor }
        });
        return (await response.json()).ip;
    } finally {
        await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
}

test('proxy trust is disabled unless explicitly enabled', () => {
    assert.equal(parseTrustProxy(undefined), false);
    assert.equal(parseTrustProxy('0'), false);
    assert.equal(parseTrustProxy('1'), 1);
});

test('a direct client cannot replace its rate-limit IP with X-Forwarded-For', async () => {
    const ip = await requestIp(parseTrustProxy(undefined), '203.0.113.50');

    assert.equal(ip, '127.0.0.1');
});

test('one trusted proxy hop uses the proxy-provided client address', async () => {
    const ip = await requestIp(parseTrustProxy('1'), '203.0.113.50');

    assert.equal(ip, '203.0.113.50');
});

test('the production container publishes its configured HTTP port by default', () => {
    const compose = readFileSync(join(__dirname, '..', 'docker-compose.yml'), 'utf8');

    assert.match(compose, /TRUST_PROXY:\s*\$\{TRUST_PROXY:-0\}/);
    assert.match(compose, /ports:\s*\r?\n\s*-\s*["']\$\{PORT:-10300\}:\$\{PORT:-10300\}["']/);
});
