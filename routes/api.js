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
    
    // Check fallback hardcoded admin
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
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

module.exports = router;
