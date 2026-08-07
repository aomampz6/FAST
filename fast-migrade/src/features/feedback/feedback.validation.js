const { z } = require('zod');

const createFeedbackSchema = z.object({
    scope: z.enum(['troubleshoot', 'onu-setup']),
    refId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional()
});

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

module.exports = { createFeedbackSchema, validate };
