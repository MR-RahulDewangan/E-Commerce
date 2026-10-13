import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { registerUser, loginUser, getUserById, AuthError } from '@/modules/auth/service';
import * as cryptoModule from '@/modules/auth/crypto';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Auth Service (Unit Tests with Mocked Database)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('successfully registers user when email does not exist', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      vi.mocked(db.user.create).mockResolvedValue({
        id: 'usr_mock_1',
        email: 'pooja@example.in',
        passwordHash: 'hashed_pw',
        firstName: 'Pooja',
        lastName: 'Sharma',
        phoneNumber: '+919876543210',
        role: 'CUSTOMER',
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await registerUser({
        email: 'pooja@example.in',
        password: 'SecurePassword123!',
        firstName: 'Pooja',
        lastName: 'Sharma',
        phoneNumber: '+919876543210',
      });

      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'pooja@example.in' } });
      expect(db.user.create).toHaveBeenCalled();
      expect(result.user.id).toBe('usr_mock_1');
      expect(result.user.email).toBe('pooja@example.in');
      expect(result.token).toBeDefined();
    });

    it('throws 409 EMAIL_ALREADY_EXISTS when user already exists in DB', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'existing_usr',
        email: 'pooja@example.in',
      } as any);

      await expect(
        registerUser({
          email: 'pooja@example.in',
          password: 'SecurePassword123!',
          firstName: 'Pooja',
          lastName: 'Sharma',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'EMAIL_ALREADY_EXISTS',
          statusCode: 409,
        })
      );

      expect(db.user.create).not.toHaveBeenCalled();
    });

    it('handles race condition P2002 error from db.user.create safely', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      vi.mocked(db.user.create).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`email`)',
      });

      await expect(
        registerUser({
          email: 'pooja@example.in',
          password: 'SecurePassword123!',
          firstName: 'Pooja',
          lastName: 'Sharma',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'EMAIL_ALREADY_EXISTS',
          statusCode: 409,
        })
      );
    });

    it('propagates unexpected database connection errors', async () => {
      vi.mocked(db.user.findUnique).mockRejectedValue(new Error('Connection lost'));

      await expect(
        registerUser({
          email: 'pooja@example.in',
          password: 'SecurePassword123!',
          firstName: 'Pooja',
          lastName: 'Sharma',
        })
      ).rejects.toThrow('Connection lost');
    });
  });

  describe('loginUser', () => {
    it('successfully logs in with valid credentials', async () => {
      const realHash = await cryptoModule.hashPassword('CorrectPassword123!');
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_mock_2',
        email: 'rahul@example.in',
        passwordHash: realHash,
        firstName: 'Rahul',
        lastName: 'Mehta',
        role: 'CUSTOMER',
      } as any);

      const result = await loginUser({
        email: 'rahul@example.in',
        password: 'CorrectPassword123!',
      });

      expect(result.user.id).toBe('usr_mock_2');
      expect(result.user.email).toBe('rahul@example.in');
      expect(result.token).toBeDefined();
    });

    it('returns generic INVALID_CREDENTIALS error when user is not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(
        loginUser({
          email: 'unknown@example.in',
          password: 'SomePassword123!',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
          message: 'Invalid email or password.',
        })
      );
    });

    it('returns generic INVALID_CREDENTIALS error when password is incorrect', async () => {
      const realHash = await cryptoModule.hashPassword('CorrectPassword123!');
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_mock_2',
        email: 'rahul@example.in',
        passwordHash: realHash,
        firstName: 'Rahul',
        lastName: 'Mehta',
        role: 'CUSTOMER',
      } as any);

      await expect(
        loginUser({
          email: 'rahul@example.in',
          password: 'WrongPassword!',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
          message: 'Invalid email or password.',
        })
      );
    });

    it('returns generic INVALID_CREDENTIALS error when passwordHash is missing', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_mock_3',
        email: 'oauth_user@example.in',
        passwordHash: null,
      } as any);

      await expect(
        loginUser({
          email: 'oauth_user@example.in',
          password: 'Password123!',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
        })
      );
    });
  });

  describe('getUserById', () => {
    it('retrieves user profile without passwordHash', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'usr_123',
        email: 'user@example.in',
        firstName: 'Ananya',
        lastName: 'Rao',
        phoneNumber: null,
        role: 'CUSTOMER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const profile = await getUserById('usr_123');
      expect(profile).toBeDefined();
      expect(profile?.email).toBe('user@example.in');
      expect((profile as any)?.passwordHash).toBeUndefined();
    });
  });
});
