const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const Scom = require('../models/Scom');
const OnuConfig = require('../models/OnuConfig');

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
