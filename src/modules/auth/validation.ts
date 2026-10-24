import { z } from 'zod';

export const indianPhoneRegex = /^(?:\+91[- ]?|0)?[6-9]\d{9}$/;
export const indianGstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const indianPanRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const indianIfscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Individual field validation schemas for real-time feedback
export const emailFieldSchema = z
  .string({ required_error: 'Email is required.' })
  .min(1, 'Email is required.')
  .email('Please enter a valid email address (e.g., name@example.com)')
  .max(255, 'Email cannot exceed 255 characters.');

export const passwordFieldSchema = z
  .string({ required_error: 'Password is required.' })
  .min(1, 'Password is required.')
  .min(8, 'Password must be at least 8 characters long.')
  .max(100, 'Password cannot exceed 100 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const firstNameFieldSchema = z
  .string({ required_error: 'First name is required.' })
  .trim()
  .min(1, 'First name is required.')
  .max(50, 'First name cannot exceed 50 characters.')
  .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes');

export const lastNameFieldSchema = z
  .string({ required_error: 'Last name is required.' })
  .trim()
  .min(1, 'Last name is required.')
  .max(50, 'Last name cannot exceed 50 characters.')
  .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes');

export const phoneNumberFieldSchema = z
  .string()
  .trim()
  .refine(
    (val) => !val || indianPhoneRegex.test(val),
    {
      message: 'Must be a valid 10-digit Indian mobile number (e.g., +91 98765 43210 or 9876543210).',
    }
  )
  .optional()
  .nullable();

export const registerSchema = z.object({
  email: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      emailFieldSchema
    ),
  password: passwordFieldSchema,
  firstName: firstNameFieldSchema,
  lastName: lastNameFieldSchema,
  phoneNumber: phoneNumberFieldSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Seller registration schema (extends customer registration with seller-specific fields)
export const sellerRegisterSchema = registerSchema.extend({
  storeName: z
    .string({ required_error: 'Store name is required.' })
    .trim()
    .min(2, 'Store name must be at least 2 characters long.')
    .max(100, 'Store name cannot exceed 100 characters.'),
  storeDescription: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters.')
    .optional()
    .nullable(),
  gstin: z
    .string()
    .trim()
    .refine(
      (val) => !val || indianGstinRegex.test(val),
      {
        message: 'Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5).',
      }
    )
    .optional()
    .nullable(),
  pan: z
    .string()
    .trim()
    .refine(
      (val) => !val || indianPanRegex.test(val),
      {
        message: 'Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F).',
      }
    )
    .optional()
    .nullable(),
  bankAccount: z
    .string()
    .trim()
    .min(9, 'Bank account number must be at least 9 digits.')
    .max(30, 'Bank account number cannot exceed 30 characters.')
    .optional()
    .nullable(),
  bankIfsc: z
    .string()
    .trim()
    .refine(
      (val) => !val || indianIfscRegex.test(val),
      {
        message: 'Invalid IFSC code format. Must be 11 characters (e.g., SBIN0001234).',
      }
    )
    .optional()
    .nullable(),
});

export type SellerRegisterInput = z.infer<typeof sellerRegisterSchema>;

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

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string({ required_error: 'Verification token is required.' }).min(1, 'Invalid verification token.'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// Seller application schema (for existing customers applying to become sellers)
export const sellerApplicationSchema = z.object({
  storeName: z
    .string({ required_error: 'Store name is required.' })
    .trim()
    .min(2, 'Store name must be at least 2 characters long.')
    .max(100, 'Store name cannot exceed 100 characters.'),
  storeDescription: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters.')
    .optional()
    .nullable(),
  gstin: z
    .string({ required_error: 'GSTIN is required.' })
    .trim()
    .refine(
      (val) => indianGstinRegex.test(val.toUpperCase()),
      {
        message: 'Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5).',
      }
    ),
  pan: z
    .string({ required_error: 'PAN is required.' })
    .trim()
    .refine(
      (val) => indianPanRegex.test(val.toUpperCase()),
      {
        message: 'Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F).',
      }
    ),
  bankAccount: z
    .string({ required_error: 'Bank account number is required.' })
    .trim()
    .min(9, 'Bank account number must be at least 9 digits.')
    .max(30, 'Bank account number cannot exceed 30 characters.'),
  bankIfsc: z
    .string({ required_error: 'Bank IFSC code is required.' })
    .trim()
    .refine(
      (val) => indianIfscRegex.test(val.toUpperCase()),
      {
        message: 'Invalid IFSC code format. Must be 11 characters (e.g., SBIN0001234).',
      }
    ),
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

// Admin seller application review schema
export const sellerApplicationReviewSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID.'),
  action: z.enum(['APPROVE', 'REJECT'], { required_error: 'Action is required.' }),
  rejectionReason: z
    .string()
    .trim()
    .max(500, 'Rejection reason cannot exceed 500 characters.')
    .optional()
    .nullable(),
});

export type SellerApplicationReviewInput = z.infer<typeof sellerApplicationReviewSchema>;
