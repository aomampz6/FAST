const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const authRouter = require('./features/auth/auth.router');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? 'ok' : 'degraded',
        database: databaseConnected ? 'connected' : 'disconnected'
    });
});

app.use('/api/auth', authRouter);

app.use(errorHandler);

module.exports = app;
