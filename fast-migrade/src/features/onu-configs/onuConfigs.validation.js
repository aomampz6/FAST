const { z } = require('zod');

const createSchema = z.object({
    Brand: z.string().min(1),
    Mode: z.string().min(1),
    Details: z.string().min(1),
    Hidden: z.boolean().optional()
});

const updateSchema = createSchema.partial();

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

module.exports = { createSchema, updateSchema, validate };
