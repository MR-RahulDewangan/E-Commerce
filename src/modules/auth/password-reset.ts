import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { db } from '@/lib/db';
import { hashPassword } from './crypto';

const RESET_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

function getResetSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'dev-reset-secret-key-at-least-32-chars-long';
  return new TextEncoder().encode(secret);
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return null;
  }

  const secret = getResetSecret();

  return new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'password_reset',
    v: user.updatedAt.getTime(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAndResetPassword(token: string, newPassword: string): Promise<boolean> {
  if (!token || !newPassword || newPassword.length < 8) {
    return false;
  }

  try {
    const secret = getResetSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== 'password_reset' || !payload.sub || typeof payload.v !== 'number') {
      return false;
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return false;
    }

    // Verify token has not already been used (single-use validation)
    if (user.updatedAt.getTime() !== payload.v) {
      return false;
    }

    const newHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });

    return true;
  } catch {
    return false;
  }
}
