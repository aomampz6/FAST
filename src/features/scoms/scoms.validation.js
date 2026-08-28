const { z } = require('zod');

const scomStepItemSchema = z.object({
    StepTitle: z.string().optional(),
    Description: z.string().optional()
});

const createScomSchema = z.object({
    ID: z.string().min(1),
    Group: z.string().min(1),
    Scoms: z.string().min(1),
    Symptom: z.string().optional(),
    CheckPoint: z.string().optional(),
    // Legacy field — no longer sent by the admin form, kept accepted so old
    // API callers/data aren't broken.
    Steps: z.string().optional(),
    StepItems: z.array(scomStepItemSchema).optional(),
    NormalValue: z.string().optional(),
    Equipment: z.string().optional(),
    hidden: z.boolean().optional()
});

const updateScomSchema = createScomSchema.partial();

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

module.exports = { createScomSchema, updateScomSchema, validate };
