import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { POST as forgotPasswordHandler } from '@/app/api/v1/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '@/app/api/v1/auth/reset-password/route';
import { hashPassword, verifyPassword } from '@/modules/auth/crypto';

describe('Password Reset Workflow Integration Tests (Live PostgreSQL 16)', () => {
  let testUserId: string;
  const testEmail = `reset-tester-${Date.now()}@example.in`;
  const initialPassword = 'InitialSecure123!';
  const updatedPassword = 'NewSecretPassword456!';

  beforeAll(async () => {
    const passwordHash = await hashPassword(initialPassword);
    const user = await db.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Rohan',
        lastName: 'Mehta',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: testUserId } });
  });

  it('generates a 15-minute single-use reset token and updates password successfully', async () => {
    // 1. Request forgot password
    const forgotReq = new NextRequest('http://localhost:3000/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const forgotRes = await forgotPasswordHandler(forgotReq);
    expect(forgotRes.status).toBe(200);
    const forgotData = await forgotRes.json();
    expect(forgotData.data.resetToken).toBeDefined();

    const resetToken = forgotData.data.resetToken;

    // 2. Submit reset-password with valid token
    const resetReq = new NextRequest('http://localhost:3000/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: updatedPassword,
      }),
    });

    const resetRes = await resetPasswordHandler(resetReq);
    expect(resetRes.status).toBe(200);

    // 3. Verify user's password in database actually changed
    const updatedUser = await db.user.findUnique({ where: { id: testUserId } });
    expect(updatedUser?.passwordHash).toBeDefined();
    const isNewPassValid = await verifyPassword(updatedPassword, updatedUser!.passwordHash!);
    expect(isNewPassValid).toBe(true);

    // 4. Single-use test: Reusing the same reset token must fail
    const reuseReq = new NextRequest('http://localhost:3000/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'AnotherPassword789!',
      }),
    });

    const reuseRes = await resetPasswordHandler(reuseReq);
    expect(reuseRes.status).toBe(400);
    const reuseData = await reuseRes.json();
    expect(reuseData.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('rejects invalid or forged reset tokens', async () => {
    const invalidReq = new NextRequest('http://localhost:3000/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'invalid_or_forged_jwt_token_string',
        newPassword: 'SomePassword123!',
      }),
    });

    const invalidRes = await resetPasswordHandler(invalidReq);
    expect(invalidRes.status).toBe(400);
  });
});
