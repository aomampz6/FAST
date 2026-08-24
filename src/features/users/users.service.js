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

// The admin edit modal loads a single account straight from the database
// rather than reusing the row the table already holds, so it always shows the
// stored HR fields even if the list response predates the last change.
async function getById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) throw notFound();
    return user;
}

async function create({ username, password, role, ...rest }) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        const err = new Error('Username already exists');
        err.status = 400;
        throw err;
    }

    // `rest` carries only the HR fields the validation schema whitelists
    // (fullName, empId, firstName, lastName, deptName, deptFullName, email) —
    // anything else was already stripped before the request got here.
    const user = new User({ ...rest, username, password, role: role || 'user' });
    await user.save();
    return user;
}

async function update(id, data) {
    const user = await User.findById(id);
    if (!user) throw notFound();

    if (data.username && data.username !== user.username) {
        const taken = await User.findOne({ username: data.username, _id: { $ne: user._id } });
        if (taken) {
            const err = new Error('Username already exists');
            err.status = 400;
            throw err;
        }
    }

    Object.assign(user, data);

    // The edit modal shows ชื่อ-อังกฤษ / นามสกุล-อังกฤษ separately but the roster
    // table and the search filter both read fullName, so keep it derived from
    // the two parts unless the caller set fullName itself.
    if ((data.firstName !== undefined || data.lastName !== undefined) && data.fullName === undefined) {
        user.fullName = `${user.firstName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim();
    }

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

module.exports = { list, getById, create, update, remove, setActive, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
