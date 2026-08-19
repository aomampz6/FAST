const User = require('../auth/auth.model');

function notFound() {
    const err = new Error('User not found');
    err.status = 404;
    return err;
}

function selfActionBlocked() {
    const err = new Error('Cannot perform this action on your own account');
    err.status = 400;
    return err;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// A user-supplied search term goes into a RegExp, so any regex metacharacter in
// it would either change the query's meaning or, with something like `(a+)+$`,
// stall the server. Match it literally instead.
function escapeRegex(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Paginated and searchable — the technician roster is ~2,400 accounts, far too
// many to send to the admin page in one response.
async function list({ search = '', page = 1, limit = DEFAULT_PAGE_SIZE, role, isActive } = {}) {
    const filter = {};

    const term = String(search).trim();
    if (term) {
        const pattern = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ username: pattern }, { fullName: pattern }];
    }
    if (role === 'user' || role === 'admin') filter.role = role;
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const total = await User.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    // Clamp instead of returning an empty page: deleting the last user on the
    // final page would otherwise leave the admin staring at a blank table.
    const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);

    const items = await User.find(filter)
        .select('-password')
        // Ascending username is the only stable order here — the bulk import
        // gives thousands of accounts the same createdAt second.
        .sort({ username: 1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit);

    return { items, total, page: safePage, limit: safeLimit, totalPages };
}

async function create({ username, password, role, fullName }) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        const err = new Error('Username already exists');
        err.status = 400;
        throw err;
    }

    const user = new User({ username, password, role: role || 'user', fullName });
    await user.save();
    return user;
}

async function update(id, data) {
    const user = await User.findById(id);
    if (!user) throw notFound();

    Object.assign(user, data);
    await user.save();
    return user;
}

async function remove(id, requestingUserId) {
    if (id === requestingUserId) throw selfActionBlocked();

    const user = await User.findByIdAndDelete(id);
    if (!user) throw notFound();
    return user;
}

async function setActive(id, isActive, requestingUserId) {
    if (id === requestingUserId) throw selfActionBlocked();

    const user = await User.findById(id);
    if (!user) throw notFound();

    user.isActive = isActive;
    await user.save();
    return user;
}

module.exports = { list, create, update, remove, setActive, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
