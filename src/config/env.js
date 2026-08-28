require('dotenv').config();
const { parseTrustProxy } = require('./trustProxy');

const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET'];

for (const name of REQUIRED_VARS) {
    if (!process.env[name]) {
        throw new Error(`${name} environment variable is required`);
    }
}

module.exports = {
    port: process.env.PORT || 10300,
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    adminUser: process.env.ADMIN_USER,
    adminPass: process.env.ADMIN_PASS
};
