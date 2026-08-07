const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const authRouter = require('./features/auth/auth.router');
const scomsRouter = require('./features/scoms/scoms.router');
const parametersRouter = require('./features/parameters/parameters.router');
const onuConfigsRouter = require('./features/onu-configs/onuConfigs.router');
const guidesRouter = require('./features/guides/guides.router');
const phonebookRouter = require('./features/phonebook/phonebook.router');
const feedbackRouter = require('./features/feedback/feedback.router');
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
app.use('/api/scoms', scomsRouter);
app.use('/api/parameters', parametersRouter);
app.use('/api/onu-configs', onuConfigsRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/phonebook', phonebookRouter);
app.use('/api/feedback', feedbackRouter);

app.use(errorHandler);

module.exports = app;
