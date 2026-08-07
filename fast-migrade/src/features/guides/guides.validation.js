const { z } = require('zod');

const updateGuideSchema = z.object({
    content: z.string().min(1)
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

module.exports = { updateGuideSchema, validate };
