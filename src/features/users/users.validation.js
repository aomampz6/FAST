const { z } = require('zod');
const { validate } = require('../auth/auth.validation');

// Every HR field is optional and accepts an empty string: the admin modal
// always submits the whole form, and most of the ~2,400 imported accounts have
// no value yet for these columns.
const optionalText = z.string().trim().optional();

const createUserSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8),
    role: z.enum(['user', 'admin']).optional(),
    fullName: optionalText,
    empId: optionalText,
    firstName: optionalText,
    lastName: optionalText,
    deptName: optionalText,
    deptFullName: optionalText,
    // Validate the address only when one was actually typed — clearing the
    // field must stay allowed.
    email: z.union([z.string().trim().email(), z.literal('')]).optional()
});

const updateUserSchema = createUserSchema.partial();

const statusSchema = z.object({
    isActive: z.boolean()
});

// Rows the admin reviewed in the Excel import preview, sent back to actually
// write them. empId is re-validated here (not trusted from the client as a
// password) because commit derives the password from it fresh.
const importAccountSchema = z.object({
    username: z.string().min(3),
    empId: z.string().regex(/^\d+$/).max(8),
    fullName: optionalText,
    deptName: optionalText,
    deptFullName: optionalText,
    email: z.union([z.string().trim().email(), z.literal('')]).optional()
});

const importCommitSchema = z.object({
    accounts: z.array(importAccountSchema).min(1),
    resetPassword: z.boolean().optional()
});

module.exports = { createUserSchema, updateUserSchema, statusSchema, importCommitSchema, validate };
