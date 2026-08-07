const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    fullName: { type: String, required: false },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// The only path that writes a password to the database — every caller
// (registration, admin bootstrap) goes through this hook, so a password can
// never be persisted unhashed.
userSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
