import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  timingSafeCompare,
  generateHmacSha256,
} from '@/modules/auth/crypto';

describe('Auth Crypto Utilities', () => {
  it('hashes password and verifies successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true);

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    await expect(hashPassword('short')).rejects.toThrow('Password must be at least 8 characters long.');
  });

  it('generates secure random tokens with expected byte length', () => {
    const token1 = generateSecureToken(16);
    const token2 = generateSecureToken(16);

    expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(token2).toHaveLength(32);
    expect(token1).not.toBe(token2);
  });

  it('performs timing-safe string comparison correctly', () => {
    expect(timingSafeCompare('abcdef', 'abcdef')).toBe(true);
    expect(timingSafeCompare('abcdef', 'abcdeg')).toBe(false);
    expect(timingSafeCompare('abcdef', 'abc')).toBe(false);
  });

  it('generates HMAC-SHA256 deterministic signatures', () => {
    const secret = 'test_webhook_secret';
    const payload = 'order_123|payment_456';
    const sig1 = generateHmacSha256(payload, secret);
    const sig2 = generateHmacSha256(payload, secret);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA-256 = 64 hex chars
  });
});
