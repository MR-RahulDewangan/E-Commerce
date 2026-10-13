import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  SESSION_COOKIE_NAME,
  SessionUser,
} from '@/modules/auth/session';

describe('Auth Session JWT Utilities', () => {
  const mockUser: SessionUser = {
    id: 'usr_test_123',
    email: 'test@example.in',
    role: 'CUSTOMER',
    firstName: 'Pooja',
    lastName: 'Sharma',
  };

  it('signs and verifies a valid session token', async () => {
    const token = await createSessionToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(mockUser.id);
    expect(decoded?.email).toBe(mockUser.email);
    expect(decoded?.role).toBe(mockUser.role);
    expect(decoded?.firstName).toBe(mockUser.firstName);
    expect(decoded?.lastName).toBe(mockUser.lastName);
  });

  it('rejects tampered or forged tokens', async () => {
    const validToken = await createSessionToken(mockUser);
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';

    const result = await verifySessionToken(tamperedToken);
    expect(result).toBeNull();
  });

  it('rejects empty, malformed, or garbage strings', async () => {
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('invalid.jwt.token')).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const { SignJWT } = await import('jose/jwt/sign');
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'dev-fallback-secret-key-replace-in-production-at-least-32-chars'
    );
    const expiredToken = await new SignJWT({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secret);

    const result = await verifySessionToken(expiredToken);
    expect(result).toBeNull();
  });

  it('extracts session token from Authorization: Bearer header', () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me', {
      headers: {
        authorization: 'Bearer sample_token_abc123',
      },
    });

    const token = extractSessionToken(req);
    expect(token).toBe('sample_token_abc123');
  });

  it('extracts session token from Cookie header', () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me', {
      headers: {
        cookie: `other_cookie=xyz; ${SESSION_COOKIE_NAME}=sample_cookie_token; another=123`,
      },
    });

    const token = extractSessionToken(req);
    expect(token).toBe('sample_cookie_token');
  });

  it('returns null when neither header nor cookie is present', () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me');
    const token = extractSessionToken(req);
    expect(token).toBeNull();
  });

  it('throws an error in production environment if session secret is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.NEXTAUTH_SECRET;
    const originalSessionSecret = process.env.SESSION_SECRET;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.SESSION_SECRET;

      await expect(createSessionToken(mockUser)).rejects.toThrow(
        'FATAL: NEXTAUTH_SECRET or SESSION_SECRET must be configured in production.'
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      if (originalSecret) process.env.NEXTAUTH_SECRET = originalSecret;
      if (originalSessionSecret) process.env.SESSION_SECRET = originalSessionSecret;
    }
  });
});
