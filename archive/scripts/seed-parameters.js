const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Parameter = require('../models/Parameter');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = [
    {
        Type: 'Fiber Optic (FTTx)',
        Parameter: 'Rx Power',
        Standard: '-15 ถึง -25 dBm',
        Recommendation: 'หากค่าเกิน -25 dBm ระบบแนะนำให้เช็กสายพับ',
        Level: 'danger'
    },
    {
        Type: 'Fiber Optic (FTTx)',
        Parameter: 'Tx Power',
        Standard: '0.5 ถึง 5.0 dBm',
        Recommendation: 'ให้ตรวจสอบคุณภาพสาย Fiber หากค่าที่ส่งออกมีความผิดปกติ',
        Level: 'warning'
    },
    {
        Type: 'Router',
        Parameter: 'Client Devices',
        Standard: 'เกิน 15-20 เครื่อง',
        Recommendation: 'แนะนำให้เปลี่ยนเราเตอร์ที่มีสเปกสูงขึ้น',
        Level: 'none'
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB for seeding Parameters...');
        const existing = await Parameter.countDocuments();
        if (existing > 0) {
            console.log(`Parameters collection already has ${existing} record(s), skipping seed.`);
        } else {
            await Parameter.insertMany(seedData);
            console.log('Parameters seeded successfully!');
        }
        process.exit();
    })
    .catch(err => {
        console.error('Error seeding data:', err);
        process.exit(1);
    });
