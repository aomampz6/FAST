const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const authRouter = require('./features/auth/auth.router');
const scomsRouter = require('./features/scoms/scoms.router');
const parametersRouter = require('./features/parameters/parameters.router');
const onuConfigsRouter = require('./features/onu-configs/onuConfigs.router');
const guidesRouter = require('./features/guides/guides.router');
const phonebookRouter = require('./features/phonebook/phonebook.router');
const feedbackRouter = require('./features/feedback/feedback.router');
const usersRouter = require('./features/users/users.router');
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
app.use('/api/users', usersRouter);

// The Docker build copies the built React app into ./public (see Dockerfile).
// In local backend-only dev this directory doesn't exist — the frontend runs
// via its own Vite dev server instead, so skip static serving in that case.
const PUBLIC_DIR = path.join(__dirname, '../public');
if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));
    app.get('/{*splat}', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });
}

app.use(errorHandler);

module.exports = app;
