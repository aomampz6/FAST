const { z } = require('zod');
const { JOB_TYPES } = require('../../shared/jobTypes');

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
});

const registerSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8),
    role: z.enum(['user', 'admin']).optional(),
    fullName: z.string().optional()
});

const jobTypeSchema = z.object({
    jobType: z.enum(JOB_TYPES)
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

module.exports = { loginSchema, registerSchema, jobTypeSchema, validate };
