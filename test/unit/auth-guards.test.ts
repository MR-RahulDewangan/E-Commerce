import { describe, it, expect, vi } from 'vitest';
import { requireAuthenticatedUser, requireRole, requireAdmin } from '@/modules/auth/guards';
import * as sessionModule from '@/modules/auth/session';

describe('Auth Guards (Server-Side RBAC)', () => {
  const customerUser: sessionModule.SessionUser = {
    id: 'usr_cust_1',
    email: 'customer@example.in',
    role: 'CUSTOMER',
    firstName: 'Pooja',
    lastName: 'Sharma',
  };

  const adminUser: sessionModule.SessionUser = {
    id: 'usr_admin_1',
    email: 'admin@example.in',
    role: 'ADMIN',
    firstName: 'System',
    lastName: 'Administrator',
  };

  const fulfillmentUser: sessionModule.SessionUser = {
    id: 'usr_fulf_1',
    email: 'logistics@example.in',
    role: 'FULFILLMENT',
    firstName: 'Warehouse',
    lastName: 'Manager',
  };

  describe('requireAuthenticatedUser', () => {
    it('returns session user when request has valid authentication', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(customerUser);

      const req = new Request('http://localhost:3000/api/v1/cart');
      const user = await requireAuthenticatedUser(req);
      expect(user.id).toBe('usr_cust_1');
      expect(user.role).toBe('CUSTOMER');
    });

    it('throws 401 UNAUTHORIZED when request lacks authentication', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/v1/cart');
      await expect(requireAuthenticatedUser(req)).rejects.toThrowError(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          statusCode: 401,
        })
      );
    });
  });

  describe('requireRole', () => {
    it('allows access when user possesses the single allowed role', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(adminUser);

      const req = new Request('http://localhost:3000/api/v1/admin/products');
      const user = await requireRole('ADMIN', req);
      expect(user.role).toBe('ADMIN');
    });

    it('allows access when user possesses one of multiple allowed roles', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(fulfillmentUser);

      const req = new Request('http://localhost:3000/api/v1/admin/orders');
      const user = await requireRole(['ADMIN', 'FULFILLMENT'], req);
      expect(user.role).toBe('FULFILLMENT');
    });

    it('throws 403 FORBIDDEN when user role is not in the allowed roles', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(customerUser);

      const req = new Request('http://localhost:3000/api/v1/admin/settings');
      await expect(requireRole(['ADMIN'], req)).rejects.toThrowError(
        expect.objectContaining({
          code: 'FORBIDDEN',
          statusCode: 403,
        })
      );
    });
  });

  describe('requireAdmin', () => {
    it('allows access to admin user', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(adminUser);

      const req = new Request('http://localhost:3000/api/v1/admin');
      const user = await requireAdmin(req);
      expect(user.role).toBe('ADMIN');
    });

    it('rejects customer user with 403 FORBIDDEN', async () => {
      vi.spyOn(sessionModule, 'getSessionUserFromRequest').mockResolvedValue(customerUser);

      const req = new Request('http://localhost:3000/api/v1/admin');
      await expect(requireAdmin(req)).rejects.toThrowError(
        expect.objectContaining({
          code: 'FORBIDDEN',
          statusCode: 403,
        })
      );
    });
  });
});
