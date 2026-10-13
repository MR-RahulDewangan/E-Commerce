import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { ReservationStatus } from '@prisma/client';
import { runStockReservationCleanupWorker } from '@/modules/inventory/worker';
import { POST as cronHandler } from '@/app/api/cron/release-reservations/route';
import { NextRequest } from 'next/server';

describe('Stock Reservation Cleanup Worker Integration (Live PostgreSQL 16)', () => {
  let categoryId: string;
  let productId: string;
  let variantId: string;
  const initialStock = 10;

  beforeAll(async () => {
    const cat = await db.category.create({
      data: {
        name: 'Worker Test Category',
        slug: `worker-cat-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    const prod = await db.product.create({
      data: {
        name: 'Worker Test Product',
        slug: `worker-prod-${Date.now()}`,
        description: 'Test product for worker release verification.',
        basePrice: 499.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = prod.id;

    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `WORKER-SKU-${Date.now()}`,
        name: 'Standard Variant',
        stockQuantity: initialStock,
      },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    if (variantId) {
      await db.stockReservation.deleteMany({ where: { variantId } });
    }
    if (productId) {
      await db.product.deleteMany({ where: { id: productId } });
    }
    if (categoryId) {
      await db.category.deleteMany({ where: { id: categoryId } });
    }
  });

  it('identifies expired HELD reservations and restores variant inventory', async () => {
    // 1. Simulate hold of 3 units that expired 5 minutes ago
    const expiredQty = 3;
    await db.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: initialStock - expiredQty }, // 10 - 3 = 7
    });

    const expiredReservation = await db.stockReservation.create({
      data: {
        variantId,
        sessionToken: `expired_sess_${Date.now()}`,
        quantity: expiredQty,
        status: ReservationStatus.HELD,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      },
    });

    // 2. Simulate hold of 2 units that expires in 10 minutes (still active)
    const activeQty = 2;
    await db.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: initialStock - expiredQty - activeQty }, // 7 - 2 = 5
    });

    const activeReservation = await db.stockReservation.create({
      data: {
        variantId,
        sessionToken: `active_sess_${Date.now()}`,
        quantity: activeQty,
        status: ReservationStatus.HELD,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins future
      },
    });

    // 3. Run worker
    const result = await runStockReservationCleanupWorker();
    expect(result.releasedCount).toBeGreaterThanOrEqual(1);

    // 4. Verify expired reservation status changed to RELEASED
    const updatedExpired = await db.stockReservation.findUnique({
      where: { id: expiredReservation.id },
    });
    expect(updatedExpired?.status).toBe(ReservationStatus.RELEASED);

    // 5. Verify active reservation remains HELD
    const updatedActive = await db.stockReservation.findUnique({
      where: { id: activeReservation.id },
    });
    expect(updatedActive?.status).toBe(ReservationStatus.HELD);

    // 6. Verify variant stock restored: 5 + 3 = 8
    const updatedVariant = await db.productVariant.findUnique({
      where: { id: variantId },
    });
    expect(updatedVariant?.stockQuantity).toBe(8);

    // Clean up active reservation
    await db.stockReservation.deleteMany({
      where: { id: { in: [expiredReservation.id, activeReservation.id] } },
    });
  });

  it('triggers cleanup via /api/cron/release-reservations HTTP route handler', async () => {
    // Create an expired reservation
    const testSession = `cron_sess_${Date.now()}`;
    await db.stockReservation.create({
      data: {
        variantId,
        sessionToken: testSession,
        quantity: 1,
        status: ReservationStatus.HELD,
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/cron/release-reservations', {
      method: 'POST',
    });

    const res = await cronHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.releasedCount).toBeGreaterThanOrEqual(1);

    const checkedRes = await db.stockReservation.findFirst({
      where: { sessionToken: testSession },
    });
    expect(checkedRes?.status).toBe(ReservationStatus.RELEASED);
  });

  it('enforces CRON_SECRET authorization when configured', async () => {
    const originalSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = 'super-secret-cron-token-123';

      // 1. Unauthenticated request should fail with 401
      const unauthReq = new NextRequest('http://localhost:3000/api/cron/release-reservations', {
        method: 'POST',
      });
      const unauthRes = await cronHandler(unauthReq);
      expect(unauthRes.status).toBe(401);

      // 2. Authenticated request should succeed with 200
      const authReq = new NextRequest('http://localhost:3000/api/cron/release-reservations', {
        method: 'POST',
        headers: {
          authorization: 'Bearer super-secret-cron-token-123',
        },
      });
      const authRes = await cronHandler(authReq);
      expect(authRes.status).toBe(200);
      const data = await authRes.json();
      expect(data.success).toBe(true);
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  });
});
