import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';
import { verifyPassword } from '@/modules/auth/crypto';

describe('Authentication API & Session Integration Tests', () => {
  const testEmail = `auth_test_${Date.now()}@example.in`;
  const testPassword = 'SecurePassword123!';
  let createdUserId: string;
  let sessionCookie: string;

  beforeAll(async () => {
    // Ensure clean state for test email
    await db.user.deleteMany({
      where: { email: { in: [testEmail, 'duplicate_test@example.in'] } },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await db.user.deleteMany({
      where: {
        email: {
          in: [testEmail, 'duplicate_test@example.in'],
        },
      },
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new customer and sets secure session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          firstName: 'Pooja',
          lastName: 'Sharma',
          phoneNumber: '+919876543210',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail.toLowerCase());
      expect(data.user.firstName).toBe('Pooja');
      expect(data.user.lastName).toBe('Sharma');
      expect(data.user.role).toBe('CUSTOMER');
      expect(data.user.passwordHash).toBeUndefined(); // Never expose password hash

      createdUserId = data.user.id;

      // Verify session cookie was set
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain('session_token=');
      expect(setCookieHeader?.toLowerCase()).toContain('httponly');
      expect(setCookieHeader?.toLowerCase()).toContain('samesite=lax');

      // Verify user in the database
      const dbUser = await db.user.findUnique({
        where: { id: createdUserId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).not.toBeNull();
      // Ensure password was hashed with bcrypt and matches
      const isMatch = await verifyPassword(testPassword, dbUser!.passwordHash!);
      expect(isMatch).toBe(true);
    });

    it('rejects duplicate email registration with HTTP 409 Conflict', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'AnotherPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(data.error.message).toContain('already exists');
    });

    it('rejects invalid payload with HTTP 400 Validation Error', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'short',
          firstName: '',
          lastName: '',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(data.error.details)).toBe(true);
      expect(data.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials and issues session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(createdUserId);
      expect(data.user.email).toBe(testEmail.toLowerCase());

      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session_token=');
      // Save session cookie for subsequent tests
      const match = setCookieHeader?.match(/session_token=([^;]+)/);
      expect(match).not.toBeNull();
      sessionCookie = match![1];
    });

    it('rejects invalid password with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_user@example.in',
          password: 'Password123!',
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns authenticated user details when session cookie is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          cookie: `session_token=${sessionCookie}`,
        },
      });

      const res = await meHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(createdUserId);
      expect(data.user.email).toBe(testEmail.toLowerCase());
      expect(data.user.firstName).toBe('Pooja');
      expect(data.user.lastName).toBe('Sharma');
    });

    it('returns HTTP 401 when session cookie is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
      });

      const res = await meHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the session cookie', async () => {
      const res = await logoutHandler();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain('session_token=');
      // maxAge 0 or expired
      expect(setCookieHeader?.toLowerCase()).toMatch(/(max-age=0|expires=)/);
    });
  });
});
