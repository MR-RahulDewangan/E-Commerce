import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { POST as webhookHandler } from '@/app/api/v1/webhooks/payment/razorpay/route';
import { createCheckoutOrder } from '@/modules/checkout/service';
import { OrderStatus, PaymentStatus, ReservationStatus } from '@prisma/client';

describe('Payment Webhook API Integration Tests (Live PostgreSQL 16)', () => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_123';
  let categoryId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    // 1. Create Category & Product
    const category = await db.category.create({
      data: {
        name: 'Webhook Test Category',
        slug: `webhook-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;

    const product = await db.product.create({
      data: {
        name: 'Handwoven Linen Kurta',
        slug: `linen-kurta-${Date.now()}`,
        description: 'Premium linen kurta.',
        basePrice: 1999.0,
        isPublished: true,
        categoryId,
      },
    });
    productId = product.id;

    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: `KURTA-LINEN-${Date.now()}`,
        name: 'Natural Beige - L',
        stockQuantity: 25,
        priceOverride: null,
      },
    });
    variantId = variant.id;
  });

  afterAll(async () => {
    await db.orderItem.deleteMany({ where: { variantId } });
    await db.paymentTransaction.deleteMany({
      where: { order: { customerEmail: { contains: 'webhook-tester' } } },
    });
    await db.stockReservation.deleteMany({ where: { variantId } });
    await db.order.deleteMany({
      where: { customerEmail: { contains: 'webhook-tester' } },
    });
    await db.productVariant.deleteMany({ where: { id: variantId } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.category.deleteMany({ where: { id: categoryId } });
  });

  it('Scenario A: Successfully captures payment webhook and finalizes order', async () => {
    // 1. Create order via checkout service
    const checkoutResult = await createCheckoutOrder({
      customer: {
        name: 'Siddharth Rao',
        email: 'webhook-tester-capture@example.in',
        phone: '+919876543210',
      },
      shippingAddress: {
        recipientName: 'Siddharth Rao',
        phoneNumber: '+919876543210',
        streetLine1: 'Indiranagar 100ft Road',
        city: 'Bengaluru',
        stateProvince: 'Karnataka',
        postalCode: '560038',
        countryCode: 'IN',
      },
      paymentMethod: 'MOCK',
      items: [{ variantId, quantity: 1 }],
    });

    const { orderId, gatewayOrderId } = checkoutResult;

    // Verify initial state is PENDING with held reservation
    const initialOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { reservations: true, transactions: true },
    });
    expect(initialOrder?.status).toBe(OrderStatus.PENDING);
    expect(initialOrder?.reservations[0].status).toBe(ReservationStatus.HELD);
    expect(initialOrder?.transactions[0].status).toBe(PaymentStatus.INITIATED);

    // 2. Prepare Razorpay webhook payload
    const webhookPayload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_test_merchant',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_live_capture_987',
            order_id: gatewayOrderId,
            amount: 199900,
            currency: 'INR',
            status: 'captured',
            notes: {
              orderId,
            },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    });

    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    // 3. Dispatch Webhook Request
    const req = new NextRequest('http://localhost:3000/api/v1/webhooks/payment/razorpay', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: webhookPayload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    // 4. Verify Database state: Order PAID, Stock reservation CONSUMED, Transaction SUCCEEDED
    const finalizedOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { reservations: true, transactions: true },
    });
    expect(finalizedOrder?.status).toBe(OrderStatus.PAID);
    expect(finalizedOrder?.reservations[0].status).toBe(ReservationStatus.CONSUMED);
    expect(finalizedOrder?.transactions[0].status).toBe(PaymentStatus.SUCCEEDED);
    expect(finalizedOrder?.transactions[0].gatewayPaymentId).toBe('pay_rzp_live_capture_987');

    // 5. Scenario B: Idempotency check - Replaying the exact same webhook must succeed without error
    const replayReq = new NextRequest('http://localhost:3000/api/v1/webhooks/payment/razorpay', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: webhookPayload,
    });

    const replayRes = await webhookHandler(replayReq);
    expect(replayRes.status).toBe(200);
    const replayBody = await replayRes.json();
    expect(replayBody.received).toBe(true);

    // Re-verify order remained in PAID state without changes
    const stillPaidOrder = await db.order.findUnique({ where: { id: orderId } });
    expect(stillPaidOrder?.status).toBe(OrderStatus.PAID);
  });

  it('Scenario C: Rejects Webhook with Invalid or Forged Signature', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_bad', order_id: 'ord_bad' } } },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/webhooks/payment/razorpay', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': 'forged_fake_signature_hex',
      },
      body: payload,
    });

    const res = await webhookHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.received).toBe(false);
    expect(body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });
});
