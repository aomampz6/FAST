const assert = require('node:assert/strict');
const test = require('node:test');
const User = require('../src/features/auth/auth.model');
const { findByIdentifier } = require('../src/features/auth/auth.service');

// Stands in for the two collection reads findByIdentifier makes, and records
// the empId filter so the zero-padding cases can assert on what was queried.
function withRoster(accounts) {
    const originalFindOne = User.findOne;
    const originalFind = User.find;
    const calls = { empIdFilter: null };

    User.findOne = async ({ username }) => accounts.find((a) => a.username === username) || null;
    User.find = ({ empId }) => {
        calls.empIdFilter = empId;
        const wanted = empId && empId.$in ? empId.$in : [empId];
        const matches = accounts.filter((a) => wanted.includes(a.empId));
        return { limit: (n) => matches.slice(0, n) };
    };

    const restore = () => {
        User.findOne = originalFindOne;
        User.find = originalFind;
    };
    return { calls, restore };
}

async function resolve(accounts, identifier) {
    const { calls, restore } = withRoster(accounts);
    try {
        return { user: await findByIdentifier(identifier), calls };
    } finally {
        restore();
    }
}

const AATSAWIN = { username: 'aatsawin.k', empId: '46700142' };

test('resolves an account by its username', async () => {
    const { user } = await resolve([AATSAWIN], 'aatsawin.k');
    assert.equal(user, AATSAWIN);
});

test('resolves an account by its employee id', async () => {
    const { user } = await resolve([AATSAWIN], '46700142');
    assert.equal(user, AATSAWIN);
});

test('ignores surrounding whitespace in the identifier', async () => {
    const { user } = await resolve([AATSAWIN], '  46700142 ');
    assert.equal(user, AATSAWIN);
});

test('accepts an employee id typed with the zero padding the importer applies', async () => {
    const short = { username: 'somchai.p', empId: '5310003' };
    const { user } = await resolve([short], '05310003');
    assert.equal(user, short);
});

test('accepts a stored zero-padded employee id typed without its padding', async () => {
    const padded = { username: 'somchai.p', empId: '05310003' };
    const { user } = await resolve([padded], '5310003');
    assert.equal(user, padded);
});

test('does not build numeric variants for a non-numeric identifier', async () => {
    const { calls } = await resolve([], 'aatsawin.k');
    assert.deepEqual(calls.empIdFilter, { $in: ['aatsawin.k'] });
});

test('prefers a username match over another account whose employee id is the same string', async () => {
    const numericUsername = { username: '46700142', empId: '11111111' };
    const { user } = await resolve([numericUsername, AATSAWIN], '46700142');
    assert.equal(user, numericUsername);
});

test('refuses an employee id shared by more than one account', async () => {
    const twin = { username: 'somchai.p', empId: '46700142' };
    const { user } = await resolve([AATSAWIN, twin], '46700142');
    assert.equal(user, null);
});

test('returns null for an unknown identifier', async () => {
    const { user } = await resolve([AATSAWIN], 'nobody');
    assert.equal(user, null);
});

test('returns null for an empty identifier without querying the roster', async () => {
    const { user, calls } = await resolve([AATSAWIN], '   ');
    assert.equal(user, null);
    assert.equal(calls.empIdFilter, null);
});
