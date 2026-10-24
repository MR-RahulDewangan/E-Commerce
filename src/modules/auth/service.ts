import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from './crypto';
import { createSessionToken, SessionUser } from './session';
import { RegisterInput, LoginInput, SellerRegisterInput, SellerApplicationInput, SellerApplicationReviewInput } from './validation';
import { Prisma } from '@prisma/client';

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
 * Registers a new seller user with store profile.
 * Creates user with SELLER role and associated SellerProfile.
 */
export async function registerSeller(input: SellerRegisterInput): Promise<AuthSuccessResult> {
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

  // Generate a unique store slug from store name
  const baseSlug = input.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);

  // Check if slug exists and append random suffix if needed
  let storeSlug = baseSlug;
  let slugAttempts = 0;
  while (slugAttempts < 5) {
    const existingSlug = await db.sellerProfile.findUnique({
      where: { storeSlug },
    });
    if (!existingSlug) break;
    storeSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    slugAttempts++;
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: input.phoneNumber || null,
          role: 'SELLER',
        },
      });

      const sellerProfile = await tx.sellerProfile.create({
        data: {
          userId: newUser.id,
          storeName: input.storeName,
          storeSlug,
          description: input.storeDescription || null,
          gstin: input.gstin || null,
          pan: input.pan || null,
          bankAccount: input.bankAccount || null,
          bankIfsc: input.bankIfsc || null,
          commissionRate: new Prisma.Decimal(10.00),
          isVerified: true,
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

      return { user: sessionUser, token, sellerProfile };
    });

    return { user: result.user, token: result.token };
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

/**
 * Submits a seller application for an existing customer.
 * Customer must be logged in and have CUSTOMER role.
 */
export async function submitSellerApplication(userId: string, input: SellerApplicationInput) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { sellerApplication: true, sellerProfile: true },
  });

  if (!user) {
    throw new AuthError('User not found.', 'USER_NOT_FOUND', 404);
  }

  if (user.role !== 'CUSTOMER') {
    throw new AuthError('Only customers can apply to become sellers.', 'INVALID_ROLE', 400);
  }

  if (user.sellerProfile) {
    throw new AuthError('User already has a seller profile.', 'SELLER_PROFILE_EXISTS', 400);
  }

  if (user.sellerApplication) {
    throw new AuthError('Seller application already submitted.', 'APPLICATION_EXISTS', 400);
  }

  // Generate a unique store slug from store name
  const baseSlug = input.storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);

  let storeSlug = baseSlug;
  let slugAttempts = 0;
  while (slugAttempts < 5) {
    const existingSlug = await db.sellerProfile.findUnique({
      where: { storeSlug },
    });
    if (!existingSlug) break;
    storeSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    slugAttempts++;
  }

  const application = await db.sellerApplication.create({
    data: {
      userId,
      storeName: input.storeName,
      storeDescription: input.storeDescription || null,
      gstin: input.gstin.toUpperCase(),
      pan: input.pan.toUpperCase(),
      bankAccount: input.bankAccount,
      bankIfsc: input.bankIfsc.toUpperCase(),
      status: 'PENDING',
    },
  });

  return application;
}

/**
 * Gets the seller application for the current user.
 */
export async function getSellerApplication(userId: string) {
  return db.sellerApplication.findUnique({
    where: { userId },
  });
}

/**
 * Admin: Approves or rejects a seller application.
 * If approved, creates SellerProfile and updates user role to SELLER.
 */
export async function reviewSellerApplication(adminId: string, input: SellerApplicationReviewInput) {
  const application = await db.sellerApplication.findUnique({
    where: { id: input.applicationId },
    include: { user: true },
  });

  if (!application) {
    throw new AuthError('Application not found.', 'APPLICATION_NOT_FOUND', 404);
  }

  if (application.status !== 'PENDING') {
    throw new AuthError('Application has already been reviewed.', 'APPLICATION_REVIEWED', 400);
  }

  if (input.action === 'REJECT') {
    if (!input.rejectionReason) {
      throw new AuthError('Rejection reason is required.', 'REJECTION_REASON_REQUIRED', 400);
    }

    await db.sellerApplication.update({
      where: { id: input.applicationId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: input.rejectionReason,
      },
    });

    return { success: true, action: 'REJECTED' };
  }

  // APPROVE: Transaction to create SellerProfile, update User role
  const result = await db.$transaction(async (tx) => {
    // Create SellerProfile
    const baseSlug = application.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80);

    let storeSlug = baseSlug;
    let slugAttempts = 0;
    while (slugAttempts < 5) {
      const existingSlug = await tx.sellerProfile.findUnique({
        where: { storeSlug },
      });
      if (!existingSlug) break;
      storeSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      slugAttempts++;
    }

    const sellerProfile = await tx.sellerProfile.create({
      data: {
        userId: application.userId,
        storeName: application.storeName,
        storeSlug,
        description: application.storeDescription,
        gstin: application.gstin,
        pan: application.pan,
        bankAccount: application.bankAccount,
        bankIfsc: application.bankIfsc,
        commissionRate: new Prisma.Decimal(10.00),
        isVerified: true,
      },
    });

    // Update user role to SELLER
    const updatedUser = await tx.user.update({
      where: { id: application.userId },
      data: { role: 'SELLER' },
    });

    // Update application status
    await tx.sellerApplication.update({
      where: { id: input.applicationId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    return { sellerProfile, updatedUser };
  });

  return { success: true, action: 'APPROVED', sellerProfile: result.sellerProfile };
}

/**
 * Admin: Gets all seller applications with pagination and status filter.
 */
export async function getSellerApplications(options?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = options?.status ? { status: options.status } : {};

  const [applications, total] = await Promise.all([
    db.sellerApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit,
    }),
    db.sellerApplication.count({ where }),
  ]);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
