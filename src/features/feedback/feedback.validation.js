const { z } = require('zod');

const createFeedbackSchema = z.object({
    scope: z.enum(['troubleshoot', 'onu-setup', 'ata-setup', 'ap-setup']),
    refId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional()
});

const updateStatusSchema = z.object({
    status: z.enum(['new', 'resolved'])
});

const replySchema = z.object({
    adminComment: z.string().trim().max(2000, 'ข้อความยาวเกิน 2000 ตัวอักษร')
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

module.exports = { createFeedbackSchema, updateStatusSchema, replySchema, validate };
