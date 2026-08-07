const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const seedInitialData = require('./scripts/seed-initial');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10300;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fast_db';

app.get('/api/health', (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? 'ok' : 'degraded',
        database: databaseConnected ? 'connected' : 'disconnected'
    });
});

// API routes are mounted before the static file server so that nothing under /api
// can ever fall through to raw filesystem serving (e.g. a crafted /api/x/../../y path).
app.use('/api', require('./routes/api'));

// Serve static frontend files. Only the specific public directories/files needed by
// the browser are exposed — never the whole project root, which would otherwise leak
// backend source (server.js, routes/, models/, utils/, scripts/, package.json, etc.)
// and the secrets/fallback credentials hardcoded in them.
const PUBLIC_FILES = ['index.html', 'app.html', 'app.js', 'style.css', 'login.js', 'lucide.min.js'];
PUBLIC_FILES.forEach(file => {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/guides', express.static(path.join(__dirname, 'guides')));

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        await seedInitialData();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
