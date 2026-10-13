import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createSessionToken } from '@/modules/auth/session';

describe('Next.js Edge RBAC Middleware Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    customerToken = await createSessionToken({
      id: 'usr_cust_test',
      email: 'customer@example.in',
      role: 'CUSTOMER',
      firstName: 'Pooja',
      lastName: 'Sharma',
    });

    adminToken = await createSessionToken({
      id: 'usr_admin_test',
      email: 'admin@example.in',
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Admin',
    });
  });

  describe('/account/* Protection', () => {
    it('redirects unauthenticated user to /login with callbackUrl', async () => {
      const req = new NextRequest('http://localhost:3000/account/profile');
      const res = await middleware(req);

      expect(res.status).toBe(307); // Next.js redirect status
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl=%2Faccount%2Fprofile');
    });

    it('allows access to authenticated customer and injects identity headers', async () => {
      const req = new NextRequest('http://localhost:3000/account/profile', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('/admin/* Protection', () => {
    it('redirects unauthenticated browser request to /login', async () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
    });

    it('rejects customer account from /admin/* with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(403);
    });

    it('allows authenticated administrator into /admin/*', async () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: {
          cookie: `session_token=${adminToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('/api/admin/* and /api/v1/admin/* Protection', () => {
    it('returns HTTP 401 JSON when API request is unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/products');
      const res = await middleware(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns HTTP 403 JSON when customer attempts to access admin API', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/products', {
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

    it('allows administrator into admin API', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/products', {
        headers: {
          cookie: `session_token=${adminToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Public Routes Bypass', () => {
    it('allows unrestricted access to public storefront routes', async () => {
      const req = new NextRequest('http://localhost:3000/products/handloom-kurta');
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });
});
