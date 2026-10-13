import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from './crypto';
import { createSessionToken, SessionUser } from './session';
import { RegisterInput, LoginInput } from './validation';

export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface AuthSuccessResult {
  user: SessionUser;
  token: string;
}

/**
 * Registers a new customer user, creates their initial account record,
 * and generates a secure session token.
 */
export async function registerUser(input: RegisterInput): Promise<AuthSuccessResult> {
  const existingUser = await db.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AuthError(
      'An account with this email address already exists.',
      'EMAIL_ALREADY_EXISTS',
      409
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const newUser = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber || null,
        role: 'CUSTOMER',
      },
    });

    const sessionUser: SessionUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };

    const token = await createSessionToken(sessionUser);

    return { user: sessionUser, token };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new AuthError(
        'An account with this email address already exists.',
        'EMAIL_ALREADY_EXISTS',
        409
      );
    }
    throw error;
  }
}

/**
 * Authenticates user credentials and returns session user with token.
 */
export async function loginUser(input: LoginInput): Promise<AuthSuccessResult> {
  const user = await db.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  const token = await createSessionToken(sessionUser);

  return { user: sessionUser, token };
}

/**
 * Retrieves user profile by ID excluding sensitive password hash.
 */
export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
