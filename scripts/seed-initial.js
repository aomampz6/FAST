const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const Scom = require('../models/Scom');
const OnuConfig = require('../models/OnuConfig');
const User = require('../models/User');

function readScomSeedData() {
    const dataPath = path.join(__dirname, '../data.js');
    const source = fs.readFileSync(dataPath, 'utf8');
    return vm.runInNewContext(`${source}\nfastData;`, Object.create(null), {
        filename: dataPath
    });
}

async function seedInitialData() {
    const [scomCount, onuConfigCount] = await Promise.all([
        Scom.estimatedDocumentCount(),
        OnuConfig.estimatedDocumentCount()
    ]);

    if (scomCount === 0) {
        const scomData = readScomSeedData();
        await Scom.insertMany(scomData);
        console.log(`Seeded ${scomData.length} initial SCOM records`);
    }

    if (onuConfigCount === 0) {
        const onuData = require('../onu_data');
        await OnuConfig.insertMany(onuData);
        console.log(`Seeded ${onuData.length} initial ONU configuration records`);
    }

    await seedAdminUser();
}

// Bootstraps the first admin account from ADMIN_USER/ADMIN_PASS so the
// deployment has a real DB-backed admin instead of a hardcoded credential.
// Runs only once: skipped once any admin user already exists in the database.
async function seedAdminUser() {
    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) return;

    const { ADMIN_USER, ADMIN_PASS } = process.env;
    if (!ADMIN_USER || !ADMIN_PASS) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('No admin user exists and ADMIN_USER/ADMIN_PASS are not set — cannot bootstrap admin access');
        }
        console.warn('No admin user exists and ADMIN_USER/ADMIN_PASS are not set — skipping admin bootstrap');
        return;
    }

    await User.create({ username: ADMIN_USER, password: ADMIN_PASS, role: 'admin' });
    console.log(`Seeded initial admin user "${ADMIN_USER}"`);
}

if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });

    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fast_db';
    mongoose.connect(mongodbUri)
        .then(seedInitialData)
        .then(() => mongoose.disconnect())
        .then(() => {
            console.log('Initial data check completed');
            process.exit(0);
        })
        .catch(async (err) => {
            console.error('Initial data seed failed:', err);
            await mongoose.disconnect().catch(() => {});
            process.exit(1);
        });
}

module.exports = seedInitialData;
