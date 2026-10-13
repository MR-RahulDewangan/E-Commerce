import { z } from 'zod';

export const indianPhoneRegex = /^(?:\+91[- ]?|0)?[6-9]\d{9}$/;

export const registerSchema = z.object({
  email: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.string({ required_error: 'Email is required.' }).email('Must be a valid email address.')
    )
    .pipe(z.string().max(255, 'Email cannot exceed 255 characters.')),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters long.')
    .max(100, 'Password cannot exceed 100 characters.'),
  firstName: z
    .string({ required_error: 'First name is required.' })
    .trim()
    .min(1, 'First name is required.')
    .max(50, 'First name cannot exceed 50 characters.'),
  lastName: z
    .string({ required_error: 'Last name is required.' })
    .trim()
    .min(1, 'Last name is required.')
    .max(50, 'Last name cannot exceed 50 characters.'),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (val) => !val || indianPhoneRegex.test(val),
      {
        message: 'Must be a valid 10-digit Indian mobile number (e.g., +919876543210 or 9876543210).',
      }
    )
    .optional()
    .nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string({ required_error: 'Email is required.' }).email('Must be a valid email address.')
  ),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
