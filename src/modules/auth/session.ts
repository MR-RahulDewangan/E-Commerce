import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { Role } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_DURATION_SECONDS = 14 * 24 * 60 * 60; // 14-day rolling session

function getSessionSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: NEXTAUTH_SECRET or SESSION_SECRET must be configured in production.');
    }
    return new TextEncoder().encode('dev-fallback-secret-key-replace-in-production-at-least-32-chars');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a signed JWT session token valid for 14 days.
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const secret = getSessionSecret();

  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies and decodes a session JWT token.
 * Returns null if the token is invalid, expired, or tampered with.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);

    if (
      !payload.sub ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as Role,
      firstName: (payload.firstName as string) || '',
      lastName: (payload.lastName as string) || '',
    };
  } catch {
    return null;
  }
}

/**
 * Returns standard HTTP-only cookie configuration for the session token.
 */
export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  };
}

/**
 * Extracts session token from HTTP Request headers or cookie string.
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (bearer) return bearer;
  }

  // 2. Check Cookie header
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      const rawValue = trimmed.substring(SESSION_COOKIE_NAME.length + 1);
      return decodeURIComponent(rawValue);
    }
  }

  return null;
}

/**
 * Helper to authenticate and extract the active user from an incoming Request.
 */
export async function getSessionUserFromRequest(req: Request): Promise<SessionUser | null> {
  const token = extractSessionToken(req);
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}
