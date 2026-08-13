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

async function list() {
    return User.find().select('-password');
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

module.exports = { list, create, update, remove, setActive };
