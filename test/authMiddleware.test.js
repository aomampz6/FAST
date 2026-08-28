const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const User = require('../src/features/auth/auth.model');
const { verifyToken } = require('../src/middleware/auth');

function runVerifyToken({ decoded = { id: 'user-1', role: 'admin' }, user }) {
    const originalVerify = jwt.verify;
    const originalFindById = User.findById;

    jwt.verify = (_token, _secret, callback) => callback(null, decoded);
    User.findById = () => ({ select: async () => user });

    return new Promise((resolve, reject) => {
        const req = { headers: { authorization: 'Bearer valid-token' } };
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                resolve({ status: this.statusCode, body, req });
            }
        };

        const timeout = setTimeout(() => reject(new Error('verifyToken did not finish')), 1000);
        const finish = (result) => {
            clearTimeout(timeout);
            jwt.verify = originalVerify;
            User.findById = originalFindById;
            resolve(result);
        };

        res.json = function json(body) {
            finish({ status: this.statusCode, body, req });
        };

        verifyToken(req, res, () => finish({ status: 200, req }));
    }).finally(() => {
        jwt.verify = originalVerify;
        User.findById = originalFindById;
    });
}

test('uses the current database role instead of a stale JWT role', async () => {
    const result = await runVerifyToken({ user: { _id: 'user-1', role: 'user', isActive: true } });

    assert.equal(result.status, 200);
    assert.deepEqual(result.req.user, { id: 'user-1', role: 'user' });
});

test('rejects a valid token after its account is suspended', async () => {
    const result = await runVerifyToken({ user: { _id: 'user-1', role: 'user', isActive: false } });

    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { message: 'Unauthorized' });
});

test('rejects a valid token after its account is deleted', async () => {
    const result = await runVerifyToken({ user: null });

    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { message: 'Unauthorized' });
});
