import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { createSessionToken } from '@/modules/auth/session';
import { POST as refundOrderHandler } from '@/app/api/v1/admin/orders/[id]/refund/route';

describe('Admin Refund Processing Integration Tests (Live PostgreSQL 16)', () => {
  let adminToken: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let orderId: string;
  let partialOrderId: string;
  const initialStock = 10;
  const orderQty = 2;

  beforeAll(async () => {
    adminToken = await createSessionToken({
      id: 'usr_admin_ref',
      email: 'admin.refund@example.in',
      role: 'ADMIN',
      firstName: 'Finance',
      lastName: 'Manager',
    });

    const category = await db.category.create({
      data: {
        name: 'Refund Test Category',
        slug: `ref-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;

    const product = await db.product.create({
      data: {
        name: 'Refundable Silk Kurta',
        slug: `ref-prod-${Date.now()}`,
        description: 'Product for verifying refunds and inventory restitution.',
        basePrice: 1999.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = product.id;

    // Simulate inventory decremented at purchase: 10 - 2 = 8
    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `REF-SKU-${Date.now()}`,
        name: 'Size M - Navy Blue',
        stockQuantity: initialStock - orderQty, // 8 units
      },
    });
    variantId = variant.id;

    // Create Order 1 (for full refund with restock)
    const order = await db.order.create({
      data: {
        orderNumber: `ORD-REF-${Date.now()}`,
        customerName: 'Ananya Roy',
        customerEmail: 'ananya.roy@example.in',
        customerPhone: '9123456780',
        shippingAddressSnapshot: {
          recipientName: 'Ananya Roy',
          streetLine1: 'B-12 Park Street',
          city: 'Kolkata',
          stateProvince: 'West Bengal',
          postalCode: '700016',
          countryCode: 'IN',
        },
        status: OrderStatus.PAID,
        paymentMethod: PaymentProvider.MOCK,
        subtotal: 3388.14,
        taxAmount: 609.86,
        shippingCost: 0.0,
        totalAmount: 3998.0,
        currency: 'INR',
        items: {
          create: [
            {
              variantId,
              skuSnapshot: `REF-SKU-${Date.now()}`,
              nameSnapshot: 'Size M - Navy Blue',
              unitPrice: 1999.0,
              quantity: orderQty,
            },
          ],
        },
        transactions: {
          create: [
            {
              provider: PaymentProvider.MOCK,
              gatewayOrderId: `mock_ord_${Date.now()}`,
              gatewayPaymentId: `mock_pay_${Date.now()}`,
              idempotencyKey: `tx_pay_${Date.now()}`,
              status: PaymentStatus.SUCCEEDED,
              amountPaise: 399800n,
              currency: 'INR',
              rawResponse: { status: 'authorized' },
            },
          ],
        },
      },
    });
    orderId = order.id;

    // Create Order 2 (for partial refund without restock)
    const partialOrder = await db.order.create({
      data: {
        orderNumber: `ORD-PARTIAL-${Date.now()}`,
        customerName: 'Kunal Sen',
        customerEmail: 'kunal.sen@example.in',
        customerPhone: '9888776655',
        shippingAddressSnapshot: {
          recipientName: 'Kunal Sen',
          streetLine1: '24 MG Road',
          city: 'Pune',
          stateProvince: 'Maharashtra',
          postalCode: '411001',
          countryCode: 'IN',
        },
        status: OrderStatus.PROCESSING,
        paymentMethod: PaymentProvider.MOCK,
        subtotal: 1694.07,
        taxAmount: 304.93,
        shippingCost: 0.0,
        totalAmount: 1999.0,
        currency: 'INR',
        transactions: {
          create: [
            {
              provider: PaymentProvider.MOCK,
              gatewayOrderId: `mock_ord_part_${Date.now()}`,
              gatewayPaymentId: `mock_pay_part_${Date.now()}`,
              idempotencyKey: `tx_part_${Date.now()}`,
              status: PaymentStatus.SUCCEEDED,
              amountPaise: 199900n,
              currency: 'INR',
              rawResponse: { status: 'authorized' },
            },
          ],
        },
      },
    });
    partialOrderId = partialOrder.id;
  });

  afterAll(async () => {
    if (orderId) {
      await db.paymentTransaction.deleteMany({ where: { orderId } });
      await db.orderItem.deleteMany({ where: { orderId } });
      await db.order.delete({ where: { id: orderId } });
    }
    if (partialOrderId) {
      await db.paymentTransaction.deleteMany({ where: { orderId: partialOrderId } });
      await db.order.delete({ where: { id: partialOrderId } });
    }
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

  it('processes full order refund, records refund transaction, and restocks inventory pool', async () => {
    const reason = 'Customer cancelled due to incorrect size selection';

    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason,
        restockInventory: true,
      }),
    });

    const res = await refundOrderHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderStatus).toBe('REFUNDED');
    expect(body.data.amountPaise).toBe(399800);
    expect(body.data.restockedCount).toBe(orderQty);

    // 1. Verify PaymentTransaction record with status REFUNDED
    const refundTx = await db.paymentTransaction.findFirst({
      where: { orderId, status: PaymentStatus.REFUNDED },
    });
    expect(refundTx).toBeDefined();
    expect(Number(refundTx?.amountPaise)).toBe(399800);

    // 2. Verify Order status is REFUNDED
    const updatedOrder = await db.order.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.status).toBe(OrderStatus.REFUNDED);

    // 3. Verify stock restored to original level: 8 + 2 = 10
    const updatedVariant = await db.productVariant.findUnique({ where: { id: variantId } });
    expect(updatedVariant?.stockQuantity).toBe(initialStock);

    // 4. Verify audit log attached to variant
    const attrs = updatedVariant?.attributes as any;
    expect(attrs.auditLog.length).toBeGreaterThanOrEqual(1);
    const lastAudit = attrs.auditLog[attrs.auditLog.length - 1];
    expect(lastAudit.delta).toBe(orderQty);
    expect(lastAudit.newStock).toBe(initialStock);
    expect(lastAudit.adjustedBy).toBe('admin.refund@example.in');
  });

  it('processes partial refund without changing terminal status or restocking inventory', async () => {
    const partialAmountPaise = 50000; // ₹500.00
    const reason = 'Goodwill partial refund for delivery delay';

    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${partialOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amountPaise: partialAmountPaise,
        reason,
        restockInventory: false,
      }),
    });

    const res = await refundOrderHandler(req, {
      params: Promise.resolve({ id: partialOrderId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.amountPaise).toBe(partialAmountPaise);
    expect(body.data.orderStatus).toBe('PROCESSING'); // Retains active status
    expect(body.data.restockedCount).toBe(0);

    // Verify database record
    const refundTx = await db.paymentTransaction.findFirst({
      where: { orderId: partialOrderId, status: PaymentStatus.REFUNDED },
    });
    expect(refundTx).toBeDefined();
    expect(Number(refundTx?.amountPaise)).toBe(partialAmountPaise);

    const dbOrder = await db.order.findUnique({ where: { id: partialOrderId } });
    expect(dbOrder?.status).toBe(OrderStatus.PROCESSING);
  });

  it('rejects subsequent refund on already fully refunded order with HTTP 400', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Duplicate refund attempt' }),
    });

    const res = await refundOrderHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('ALREADY_REFUNDED');
  });

  it('rejects refund amount exceeding total order value with HTTP 400', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${partialOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amountPaise: 99999900, // ₹999,999.00
        reason: 'Excessive refund test',
      }),
    });

    const res = await refundOrderHandler(req, {
      params: Promise.resolve({ id: partialOrderId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('EXCESSIVE_REFUND');
  });
});
