const { port } = require('./config/env');
const { connectDb } = require('./config/db');
const app = require('./app');
const logger = require('./shared/logger');
const seedAdmin = require('./scripts/seed-admin');
const seedModeTopics = require('./scripts/seed-mode-topics');

async function startServer() {
    try {
        await connectDb();
        logger.info('Connected to MongoDB');

        await seedAdmin();
        await seedModeTopics();

        app.listen(port, '0.0.0.0', () => {
            logger.info(`Server running on port ${port}`);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
