const { z } = require('zod');

const groupSchema = z.object({
    title: z.string().min(1),
    icon: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional()
});

const groupUpdateSchema = groupSchema.partial();

const contactSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    phone: z.string().min(1),
    extension: z.string().optional()
});

const contactUpdateSchema = contactSchema.partial();

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

module.exports = { groupSchema, groupUpdateSchema, contactSchema, contactUpdateSchema, validate };
