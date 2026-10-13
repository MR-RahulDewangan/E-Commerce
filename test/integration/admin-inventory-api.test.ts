import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken } from '@/modules/auth/session';
import { GET as listInventoryHandler } from '@/app/api/v1/admin/inventory/route';
import { POST as adjustInventoryHandler } from '@/app/api/v1/admin/inventory/adjust/route';

describe('Admin Inventory Management & Audit Log Integration Tests (Live PostgreSQL 16)', () => {
  let adminToken: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  const initialStock = 12;

  beforeAll(async () => {
    adminToken = await createSessionToken({
      id: 'usr_admin_inv',
      email: 'admin.inv@example.in',
      role: 'ADMIN',
      firstName: 'Warehouse',
      lastName: 'Manager',
    });

    const category = await db.category.create({
      data: {
        name: 'Inventory Test Category',
        slug: `inv-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;

    const product = await db.product.create({
      data: {
        name: 'Inventory Managed Kurta',
        slug: `inv-prod-${Date.now()}`,
        description: 'Product for verifying inventory adjustments and audit entries.',
        basePrice: 1299.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = product.id;

    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `INV-SKU-${Date.now()}`,
        name: 'Size L - White',
        stockQuantity: initialStock,
      },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    if (variantId) {
      await db.productVariant.deleteMany({ where: { id: variantId } });
    }
    if (productId) {
      await db.product.deleteMany({ where: { id: productId } });
    }
    if (categoryId) {
      await db.category.deleteMany({ where: { id: categoryId } });
    }
  });

  it('lists inventory items via GET /api/v1/admin/inventory', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory?search=INV-SKU', {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await listInventoryHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const target = body.data.find((v: any) => v.id === variantId);
    expect(target).toBeDefined();
    expect(target.stockQuantity).toBe(initialStock);
  });

  it('increments stock atomically and records audit entry on supplier restock', async () => {
    const delta = 15;
    const reason = 'Supplier delivery batch #4082';

    const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ variantId, delta, reason }),
    });

    const res = await adjustInventoryHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.previousStock).toBe(initialStock);
    expect(body.data.newStock).toBe(initialStock + delta); // 12 + 15 = 27
    expect(body.data.delta).toBe(delta);
    expect(body.data.reason).toBe(reason);

    // Verify database record
    const dbVariant = await db.productVariant.findUnique({ where: { id: variantId } });
    expect(dbVariant?.stockQuantity).toBe(27);

    const attrs = dbVariant?.attributes as any;
    expect(Array.isArray(attrs.auditLog)).toBe(true);
    expect(attrs.auditLog.length).toBe(1);
    expect(attrs.auditLog[0].reason).toBe(reason);
    expect(attrs.auditLog[0].newStock).toBe(27);
    expect(attrs.auditLog[0].adjustedBy).toBe('admin.inv@example.in');
  });

  it('decrements stock atomically and appends to audit log', async () => {
    const delta = -5;
    const reason = 'Damaged items during warehouse water leak';

    const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ variantId, delta, reason }),
    });

    const res = await adjustInventoryHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.previousStock).toBe(27);
    expect(body.data.newStock).toBe(22); // 27 - 5 = 22

    // Verify database record
    const dbVariant = await db.productVariant.findUnique({ where: { id: variantId } });
    expect(dbVariant?.stockQuantity).toBe(22);

    const attrs = dbVariant?.attributes as any;
    expect(attrs.auditLog.length).toBe(2);
    expect(attrs.auditLog[1].reason).toBe(reason);
    expect(attrs.auditLog[1].newStock).toBe(22);
  });

  it('rejects decrement exceeding available stock count with HTTP 400', async () => {
    // Current stock is 22; attempt to deduct 50
    const delta = -50;
    const reason = 'Overzealous deduction attempt';

    const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ variantId, delta, reason }),
    });

    const res = await adjustInventoryHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('NEGATIVE_STOCK_DISALLOWED');

    // Stock should remain untouched at 22
    const dbVariant = await db.productVariant.findUnique({ where: { id: variantId } });
    expect(dbVariant?.stockQuantity).toBe(22);
  });

  it('rejects adjustments with missing or empty reason codes', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/admin/inventory/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ variantId, delta: 5, reason: ' ' }),
    });

    const res = await adjustInventoryHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
