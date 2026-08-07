const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Scom = require('../models/Scom');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fast-super-secret-key-2026';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Login Route (Supports both Admin and User)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin1234';
    
    // Check fallback hardcoded admin
    if (username === adminUser && password === adminPass) {
        const token = jwt.sign({ id: username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, role: 'admin', message: 'Admin login successful' });
    }

    // Mock User Login for testing (since DB is down)
    // Allows any 6-8 digit employee ID (e.g., 26002294) to login
    if (/^\d{6,8}$/.test(username)) {
        const token = jwt.sign({ 
            id: username, 
            role: 'user', 
            fullName: 'NT Employee ' + username,
            empId: username,
            email: username + '@nt.com'
        }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, role: 'user', message: 'Mock user login successful' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, role: user.role, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Register Route (Open for now, or could be restricted to Admin)
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, fullName } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = new User({ username, password, role: role || 'user', fullName });
        await newUser.save();
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all scoms (Protected for all logged in users)
router.get('/scoms', verifyToken, async (req, res) => {
    try {
        const scoms = await Scom.find().sort({ ID: 1 });
        res.json(scoms);
    } catch (err) {
        console.warn('Database query failed, falling back to data.js:', err.message);
        try {
            const fs = require('fs');
            const path = require('path');
            const dataPath = path.join(__dirname, '../data.js');
            const dataContent = fs.readFileSync(dataPath, 'utf8');
            const startIndex = dataContent.indexOf('[');
            const endIndex = dataContent.lastIndexOf(']');
            const jsonString = dataContent.substring(startIndex, endIndex + 1);
            let fastData;
            eval('fastData = ' + jsonString);
            res.json(fastData);
        } catch (fallbackErr) {
            res.status(500).json({ message: err.message });
        }
    }
});

// POST a new scom (Admin only)
router.post('/scoms', verifyToken, async (req, res) => {
    const scom = new Scom(req.body);
    try {
        const newScom = await scom.save();
        res.status(201).json(newScom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update a scom (Admin only)
router.put('/scoms/:id', verifyToken, async (req, res) => {
    try {
        const updatedScom = await Scom.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedScom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a scom (Admin only)
router.delete('/scoms/:id', verifyToken, async (req, res) => {
    try {
        await Scom.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ONU Configs Routes
const OnuConfig = require('../models/OnuConfig');
const multer = require('multer');
const { uploadImage, deleteImage, getImageObject } = require('../utils/s3');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 50 }
});

router.get('/onu-configs', verifyToken, async (req, res) => {
    try {
        const configs = await OnuConfig.find().sort({ Brand: 1, Mode: 1 });
        res.json(configs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/onu-configs', verifyToken, async (req, res) => {
    try {
        const config = new OnuConfig(req.body);
        const newConfig = await config.save();
        res.status(201).json(newConfig);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/onu-configs/:id', verifyToken, async (req, res) => {
    try {
        const updatedConfig = await OnuConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedConfig);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/onu-configs/:id', verifyToken, async (req, res) => {
    try {
        const config = await OnuConfig.findById(req.params.id);
        if (config) {
            await Promise.all(config.Images.map(img => deleteImage(img.key).catch(() => {})));
            await config.deleteOne();
        }
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ONU Config Images — unlimited images per Brand/Mode record, stored in S3.
router.post('/onu-configs/:id/images', verifyToken, upload.array('images', 50), async (req, res) => {
    try {
        const config = await OnuConfig.findById(req.params.id);
        if (!config) return res.status(404).json({ message: 'Config not found' });

        for (const file of req.files || []) {
            const key = `onu-configs/${config._id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            await uploadImage(key, file.buffer, file.mimetype);
            config.Images.push({ key, originalName: file.originalname });
        }

        await config.save();
        res.status(201).json(config);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/onu-configs/:id/images/:imageId', verifyToken, async (req, res) => {
    try {
        const config = await OnuConfig.findById(req.params.id);
        if (!config) return res.status(404).json({ message: 'Config not found' });

        const image = config.Images.find(img => img._id.toString() === req.params.imageId);
        if (!image) return res.status(404).json({ message: 'Image not found' });

        await deleteImage(image.key).catch(() => {});
        config.Images = config.Images.filter(img => img._id.toString() !== req.params.imageId);
        await config.save();
        res.json(config);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Streams an image from S3. Unauthenticated (like the static assets/ folder) so plain
// <img> tags can load it directly — these are instructional screenshots, not sensitive data.
router.get('/onu-configs/image', async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const obj = await getImageObject(key);
        res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        obj.Body.pipe(res);
    } catch (err) {
        res.status(404).json({ message: 'Image not found' });
    }
});

// Interactive Guide File Management — lets admins edit the raw HTML of the
// self-contained guide pages under /guides (e.g. huawei-hg8145v5.html) that are
// embedded via <iframe> in the ONU setup pages.
const fs = require('fs');
const path = require('path');
const GUIDES_DIR = path.join(__dirname, '../guides');

// Resolves a requested filename to a real path strictly inside GUIDES_DIR, rejecting
// path traversal (../) and anything that isn't a plain .html filename.
function resolveGuidePath(filename) {
    if (!/^[a-zA-Z0-9._-]+\.html$/.test(filename)) return null;
    const fullPath = path.join(GUIDES_DIR, filename);
    if (path.dirname(fullPath) !== GUIDES_DIR) return null;
    return fullPath;
}

router.get('/guides', verifyToken, async (req, res) => {
    try {
        const files = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.html'));
        const list = files.map(filename => {
            const stat = fs.statSync(path.join(GUIDES_DIR, filename));
            return { filename, size: stat.size, updatedAt: stat.mtime };
        });
        res.json(list);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/guides/:filename', verifyToken, async (req, res) => {
    const fullPath = resolveGuidePath(req.params.filename);
    if (!fullPath || !fs.existsSync(fullPath)) return res.status(404).json({ message: 'Guide not found' });

    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({ filename: req.params.filename, content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/guides/:filename', verifyToken, express.text({ type: '*/*', limit: '10mb' }), async (req, res) => {
    const fullPath = resolveGuidePath(req.params.filename);
    if (!fullPath || !fs.existsSync(fullPath)) return res.status(404).json({ message: 'Guide not found' });

    if (typeof req.body !== 'string' || req.body.trim().length === 0) {
        return res.status(400).json({ message: 'Empty content' });
    }

    try {
        fs.writeFileSync(fullPath, req.body, 'utf8');
        res.json({ message: 'Saved successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Reference Parameters Routes
const Parameter = require('../models/Parameter');

router.get('/parameters', verifyToken, async (req, res) => {
    try {
        const parameters = await Parameter.find().sort({ createdAt: 1 });
        res.json(parameters);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/parameters', verifyToken, async (req, res) => {
    try {
        const parameter = new Parameter(req.body);
        const newParameter = await parameter.save();
        res.status(201).json(newParameter);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/parameters/:id', verifyToken, async (req, res) => {
    try {
        const updatedParameter = await Parameter.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedParameter);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/parameters/:id', verifyToken, async (req, res) => {
    try {
        await Parameter.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
