const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

async function connectDb() {
    await mongoose.connect(mongodbUri);
}

module.exports = { connectDb, mongoose };
