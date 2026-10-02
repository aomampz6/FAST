const { z } = require('zod');

// Pathname only (what react-router's location.pathname gives) — anything
// carrying a query string or host is refused rather than stored.
const pageViewSchema = z.object({
    path: z.string().min(1).max(200).regex(/^\/[^?#\s]*$/, 'Invalid path'),
});

// The admin tab offers 7 / 30 / 90; anything else falls back to 30.
const ALLOWED_DAYS = [7, 30, 90];

function parseDays(value) {
    const days = Number(value);
    return ALLOWED_DAYS.includes(days) ? days : 30;
}

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: result.error.issues[0].message });
        }
        req.body = result.data;
        next();
    };
}

module.exports = { pageViewSchema, parseDays, validate };
