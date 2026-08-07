const { z } = require('zod');

const parameterSchema = z.object({
    Type: z.string().min(1),
    Parameter: z.string().min(1),
    Standard: z.string().min(1),
    Recommendation: z.string().optional(),
    Level: z.enum(['danger', 'warning', 'info', 'none']).optional()
});

const updateParameterSchema = parameterSchema.partial();

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

module.exports = { parameterSchema, updateParameterSchema, validate };
