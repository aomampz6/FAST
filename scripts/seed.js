const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Scom = require('../models/Scom');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fast_db';

async function seedData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Read data.js and extract the JSON part
        const dataPath = path.join(__dirname, '../data.js');
        let dataContent = fs.readFileSync(dataPath, 'utf8');
        
        // Very basic parsing to get the array
        const startIndex = dataContent.indexOf('[');
        const endIndex = dataContent.lastIndexOf(']');
        const jsonString = dataContent.substring(startIndex, endIndex + 1);
        
        // Using eval since data.js might not be strict JSON (might have trailing commas, missing quotes in keys etc if handwritten)
        // But if it's well-formed JSON array, JSON.parse works. Let's try eval to be safe as it's a JS object array.
        let fastData;
        eval('fastData = ' + jsonString);

        // Clear existing data
        await Scom.deleteMany({});
        console.log('Cleared existing Scom data');

        // Insert new data
        await Scom.insertMany(fastData);
        console.log(`Successfully seeded ${fastData.length} records`);

        mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        mongoose.disconnect();
        process.exit(1);
    }
}

seedData();
