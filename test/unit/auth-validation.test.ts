import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, indianPhoneRegex } from '@/modules/auth/validation';

describe('Auth Validation Schemas', () => {
  describe('Indian Phone Regex', () => {
    it('accepts valid 10-digit Indian phone numbers with various formats', () => {
      expect(indianPhoneRegex.test('9876543210')).toBe(true);
      expect(indianPhoneRegex.test('+919876543210')).toBe(true);
      expect(indianPhoneRegex.test('+91 9876543210')).toBe(true);
      expect(indianPhoneRegex.test('+91-9876543210')).toBe(true);
      expect(indianPhoneRegex.test('09876543210')).toBe(true);
      expect(indianPhoneRegex.test('6123456789')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(indianPhoneRegex.test('1234567890')).toBe(false); // starts with 1
      expect(indianPhoneRegex.test('5123456789')).toBe(false); // starts with 5
      expect(indianPhoneRegex.test('98765')).toBe(false); // too short
      expect(indianPhoneRegex.test('987654321000')).toBe(false); // too long
    });
  });

  describe('Register Schema', () => {
    it('validates valid customer registration payload', () => {
      const result = registerSchema.safeParse({
        email: 'Customer@Example.IN',
        password: 'SecurePassword123!',
        firstName: 'Pooja',
        lastName: 'Sharma',
        phoneNumber: '+919876543210',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('customer@example.in'); // lowercased & trimmed
        expect(result.data.firstName).toBe('Pooja');
      }
    });

    it('allows registration without phone number', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'Amit',
        lastName: 'Verma',
      });

      expect(result.success).toBe(true);
    });

    it('rejects short passwords under 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
        firstName: 'Amit',
        lastName: 'Verma',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('rejects invalid email formats', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123!',
        firstName: 'Amit',
        lastName: 'Verma',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty or whitespace-only first and last names', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123!',
        firstName: '   ',
        lastName: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    it('validates valid credentials payload', () => {
      const result = loginSchema.safeParse({
        email: 'Customer@Domain.com ',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('customer@domain.com');
      }
    });

    it('rejects missing password or invalid email', () => {
      expect(loginSchema.safeParse({ email: 'invalid', password: '' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'test@example.com', password: '' }).success).toBe(false);
    });
  });
});
