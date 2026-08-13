const { z } = require('zod');
const { validate } = require('../auth/auth.validation');

const createUserSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8),
    role: z.enum(['user', 'admin']).optional(),
    fullName: z.string().optional()
});

const updateUserSchema = createUserSchema.partial();

const statusSchema = z.object({
    isActive: z.boolean()
});

module.exports = { createUserSchema, updateUserSchema, statusSchema, validate };
