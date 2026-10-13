import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import {
  reserveStockForCheckout,
  releaseReservationsBySession,
  consumeReservationsForOrder,
} from '@/modules/inventory/reservation';

describe('Inventory Reservation & High-Concurrency Protection (Live PostgreSQL 16)', () => {
  let categoryId: string;
  let productId: string;
  let variantId: string;
  const initialStock = 5;

  beforeAll(async () => {
    const cat = await db.category.create({
      data: {
        name: 'Concurrency Test Category',
        slug: `conc-cat-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    const prod = await db.product.create({
      data: {
        name: 'Limited Flash Sale Item',
        slug: `conc-prod-${Date.now()}`,
        description: 'High-demand item for race condition testing.',
        basePrice: 999.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = prod.id;

    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `CONC-SKU-${Date.now()}`,
        name: 'Standard Edition',
        stockQuantity: initialStock, // Exactly 5 units
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

  it('guarantees zero overselling when 10 concurrent requests compete for 5 items', async () => {
    const totalCompetitors = 10;
    const sessions = Array.from({ length: totalCompetitors }, (_, i) => `conc_sess_${Date.now()}_${i}`);

    // Execute 10 parallel reservation attempts simultaneously
    const results = await Promise.allSettled(
      sessions.map((sessToken) =>
        reserveStockForCheckout(sessToken, [{ variantId, quantity: 1 }])
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Exactly 5 requests must succeed
    expect(successful.length).toBe(initialStock);
    // Exactly 5 requests must fail
    expect(failed.length).toBe(totalCompetitors - initialStock);

    // Verify all failures returned INSUFFICIENT_STOCK
    for (const f of failed) {
      if (f.status === 'rejected') {
        expect((f.reason as any).code).toBe('INSUFFICIENT_STOCK');
      }
    }

    // Inspect real database inventory count: must be exactly 0, never negative
    const dbVariant = await db.productVariant.findUnique({
      where: { id: variantId },
    });
    expect(dbVariant?.stockQuantity).toBe(0);

    // Verify exactly 5 HELD reservations exist in the database
    const reservations = await db.stockReservation.findMany({
      where: { variantId, status: 'HELD' },
    });
    expect(reservations.length).toBe(initialStock);
  });

  it('restores stock correctly when holds are released', async () => {
    // Release held reservations for all successful sessions
    const heldReservations = await db.stockReservation.findMany({
      where: { variantId, status: 'HELD' },
    });

    for (const r of heldReservations) {
      await releaseReservationsBySession(r.sessionToken);
    }

    // Stock must be restored back to initialStock (5)
    const dbVariant = await db.productVariant.findUnique({
      where: { id: variantId },
    });
    expect(dbVariant?.stockQuantity).toBe(initialStock);

    // Verify all reservations are now RELEASED
    const remainingHeld = await db.stockReservation.findMany({
      where: { variantId, status: 'HELD' },
    });
    expect(remainingHeld.length).toBe(0);
  });

  it('consumes held reservations when order is placed', async () => {
    const testSession = `consume_sess_${Date.now()}`;
    const testOrderNumber = `ORD-TEST-${Date.now()}`;

    // Create real Order to satisfy foreign key constraint
    const createdOrder = await db.order.create({
      data: {
        orderNumber: testOrderNumber,
        customerName: 'Pooja Sharma',
        customerEmail: 'pooja@example.in',
        customerPhone: '+919876543210',
        shippingAddressSnapshot: {
          recipientName: 'Pooja Sharma',
          streetLine1: 'Indiranagar',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560038',
          countryCode: 'IN',
        },
        paymentMethod: 'COD',
        subtotal: 1998.0,
        taxAmount: 360.0,
        shippingCost: 0.0,
        totalAmount: 1998.0,
      },
    });

    // 1. Reserve 2 units
    await reserveStockForCheckout(testSession, [{ variantId, quantity: 2 }]);

    // 2. Consume reservations for order
    const consumedCount = await consumeReservationsForOrder(testSession, createdOrder.id);
    expect(consumedCount).toBe(1);

    // 3. Verify status in database is CONSUMED
    const consumed = await db.stockReservation.findFirst({
      where: { sessionToken: testSession },
    });
    expect(consumed?.status).toBe('CONSUMED');
    expect(consumed?.orderId).toBe(createdOrder.id);

    // 4. Verify stock was permanently decremented by 2 (initial 5 - 2 = 3)
    const dbVariant = await db.productVariant.findUnique({
      where: { id: variantId },
    });
    expect(dbVariant?.stockQuantity).toBe(initialStock - 2);

    // Clean up created order
    await db.order.delete({ where: { id: createdOrder.id } });
  });
});
