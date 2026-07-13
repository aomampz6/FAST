const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Scom = require('../models/Scom'); // Assuming this exists

dotenv.config({ path: path.join(__dirname, '../.env') });

const results = [];
let lastID = '';
let lastGroup = '';
let lastScoms = '';
let idCounter = 1;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB for seeding Scoms...');
        
        fs.createReadStream(path.join(__dirname, '../scom_data.csv'))
            .pipe(csv({
                headers: ['ID', 'Group', 'Scoms', 'Symptom', 'CheckPoint', 'Steps', 'NormalValue', 'Equipment'],
                skipLines: 2 // skip the first empty line and the header row
            }))
            .on('data', (data) => {
                // Ignore empty rows
                if (!data.Group && !data.Symptom && !data.Steps) return;

                if (data.ID && data.ID.trim() !== '') {
                    lastID = data.ID;
                } else if (!lastID) {
                    lastID = 'U' + String(idCounter++).padStart(4, '0');
                }
                
                if (data.Group && data.Group.trim() !== '') {
                    lastGroup = data.Group;
                }
                
                if (data.Scoms && data.Scoms.trim() !== '') {
                    lastScoms = data.Scoms;
                }
                
                results.push({
                    ID: data.ID || lastID,
                    Group: data.Group || lastGroup,
                    Scoms: data.Scoms || lastScoms,
                    Symptom: data.Symptom || '',
                    CheckPoint: data.CheckPoint || '',
                    Steps: data.Steps || '',
                    NormalValue: data.NormalValue || '',
                    Equipment: data.Equipment || ''
                });
            })
            .on('end', async () => {
                try {
                    await Scom.deleteMany({});
                    await Scom.insertMany(results);
                    console.log(`Scom data seeded successfully with ${results.length} records!`);
                    process.exit(0);
                } catch (err) {
                    console.error('Error saving to DB:', err);
                    process.exit(1);
                }
            });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
