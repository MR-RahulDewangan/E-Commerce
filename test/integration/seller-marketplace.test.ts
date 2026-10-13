import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createSessionToken } from '@/modules/auth/session';
import { db } from '@/lib/db';
import {
  getSellerProfile,
  getSellerProducts,
  updateSellerVariantStock,
  getSellerInventory,
} from '@/modules/seller/service';

describe('Multi-Vendor Marketplace Seller Isolation & RBAC Integration Tests', () => {
  let customerToken: string;
  let seller1Token: string;
  let seller2Token: string;
  let adminToken: string;

  let seller1User: any;
  let seller2User: any;
  let seller1Profile: any;
  let seller2Profile: any;

  beforeAll(async () => {
    // 1. Fetch the 2 dummy sellers seeded in PostgreSQL
    seller1User = await db.user.findUnique({
      where: { email: 'seller.kashmir@ecommerce.example.in' },
      include: { sellerProfile: true },
    });
    seller2User = await db.user.findUnique({
      where: { email: 'seller.jaipur@ecommerce.example.in' },
      include: { sellerProfile: true },
    });

    expect(seller1User).toBeDefined();
    expect(seller2User).toBeDefined();
    expect(seller1User.role).toBe('SELLER');
    expect(seller2User.role).toBe('SELLER');

    seller1Profile = seller1User.sellerProfile;
    seller2Profile = seller2User.sellerProfile;

    expect(seller1Profile).toBeDefined();
    expect(seller2Profile).toBeDefined();

    // 2. Generate signed session JWTs
    customerToken = await createSessionToken({
      id: 'usr_test_cust',
      email: 'customer@example.in',
      role: 'CUSTOMER',
      firstName: 'Customer',
      lastName: 'User',
    });

    seller1Token = await createSessionToken({
      id: seller1User.id,
      email: seller1User.email,
      role: 'SELLER',
      firstName: seller1User.firstName,
      lastName: seller1User.lastName,
    });

    seller2Token = await createSessionToken({
      id: seller2User.id,
      email: seller2User.email,
      role: 'SELLER',
      firstName: seller2User.firstName,
      lastName: seller2User.lastName,
    });

    adminToken = await createSessionToken({
      id: 'usr_test_admin',
      email: 'admin@example.in',
      role: 'ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
    });
  });

  describe('Route Protection & RBAC Guards (/seller)', () => {
    it('redirects unauthenticated visitors to /login?callbackUrl=/seller', async () => {
      const req = new NextRequest('http://localhost:3000/seller');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl=%2Fseller');
    });

    it('blocks regular CUSTOMER users with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/seller', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it('allows verified SELLER to access /seller with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/seller', {
        headers: {
          cookie: `session_token=${seller1Token}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows ADMIN to access /seller portal for platform oversight with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/seller', {
        headers: {
          cookie: `session_token=${adminToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('Seller API Route Protection (/api/v1/seller/products)', () => {
    it('returns HTTP 401 for unauthenticated API requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/products');
      const res = await middleware(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns HTTP 403 for CUSTOMER role attempting seller API access', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/products', {
        headers: {
          cookie: `session_token=${customerToken}`,
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Multi-Vendor Catalog & Inventory Isolation', () => {
    it('isolates product catalog: Seller 1 only retrieves Seller 1 products', async () => {
      const seller1Products = await getSellerProducts(seller1Profile.id);
      expect(seller1Products.length).toBeGreaterThan(0);

      // Verify that every product retrieved belongs strictly to seller1Profile.id
      for (const prod of seller1Products) {
        expect(prod.sellerId).toBe(seller1Profile.id);
      }

      const seller2Products = await getSellerProducts(seller2Profile.id);
      expect(seller2Products.length).toBeGreaterThan(0);

      // Ensure no intersection between product IDs
      const seller1ProductIds = new Set(seller1Products.map((p) => p.id));
      for (const prod of seller2Products) {
        expect(prod.sellerId).toBe(seller2Profile.id);
        expect(seller1ProductIds.has(prod.id)).toBe(false);
      }
    });

    it('prevents cross-tenant inventory manipulation: Seller 1 cannot adjust Seller 2 variants', async () => {
      const seller2Inventory = await getSellerInventory(seller2Profile.id);
      expect(seller2Inventory.length).toBeGreaterThan(0);
      const targetVariant = seller2Inventory[0];

      // Seller 1 attempts to update a variant belonging to Seller 2
      await expect(
        updateSellerVariantStock(seller1Profile.id, targetVariant.id, 999)
      ).rejects.toThrow('Product variant not found or access denied for this seller.');

      // Verify stock was NOT altered
      const unaltered = await db.productVariant.findUnique({
        where: { id: targetVariant.id },
      });
      expect(unaltered?.stockQuantity).toBe(targetVariant.stockQuantity);
    });

    it('allows seller to update their own inventory stock level safely', async () => {
      const seller1Inventory = await getSellerInventory(seller1Profile.id);
      expect(seller1Inventory.length).toBeGreaterThan(0);
      const myVariant = seller1Inventory[0];

      const newStock = myVariant.stockQuantity + 5;
      const updated = await updateSellerVariantStock(seller1Profile.id, myVariant.id, newStock);
      expect(updated.stockQuantity).toBe(newStock);

      // Revert back for idempotency
      await updateSellerVariantStock(seller1Profile.id, myVariant.id, myVariant.stockQuantity);
    });
  });
});
