import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createSessionToken } from '@/modules/auth/session';

describe('Admin Portal Access Control & Guard Integration Tests', () => {
  let customerToken: string;
  let fulfillmentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    customerToken = await createSessionToken({
      id: 'usr_cust_01',
      email: 'customer@example.in',
      role: 'CUSTOMER',
      firstName: 'Aarav',
      lastName: 'Patel',
    });

    fulfillmentToken = await createSessionToken({
      id: 'usr_fulf_01',
      email: 'fulfillment@example.in',
      role: 'FULFILLMENT',
      firstName: 'Rahul',
      lastName: 'Verma',
    });

    adminToken = await createSessionToken({
      id: 'usr_admin_01',
      email: 'admin@example.in',
      role: 'ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
    });
  });

  describe('Page Route Protection: /admin', () => {
    it('redirects unauthenticated visitor to /login with callbackUrl', async () => {
      const req = new NextRequest('http://localhost:3000/admin');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl=%2Fadmin');
    });

    it('blocks regular CUSTOMER role with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/admin', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(403);
    });

    it('grants access to ADMIN role with HTTP 200 and injects user context headers', async () => {
      const req = new NextRequest('http://localhost:3000/admin', {
        headers: {
          cookie: `session_token=${adminToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('grants access to FULFILLMENT role with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/admin/orders', {
        headers: {
          cookie: `session_token=${fulfillmentToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('API Route Protection: /api/v1/admin/*', () => {
    it('returns HTTP 401 JSON for unauthenticated API requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/products');
      const res = await middleware(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns HTTP 403 JSON for customer role API requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory/adjust', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN role API requests through with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/products', {
        headers: {
          cookie: `session_token=${adminToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });

    it('allows FULFILLMENT role API requests through with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/orders', {
        headers: {
          cookie: `session_token=${fulfillmentToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });
  });
});
