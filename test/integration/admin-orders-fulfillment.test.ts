import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { OrderStatus, PaymentProvider } from '@prisma/client';
import { createSessionToken } from '@/modules/auth/session';
import { GET as listOrdersHandler } from '@/app/api/v1/admin/orders/route';
import { GET as getOrderHandler } from '@/app/api/v1/admin/orders/[id]/route';
import { PATCH as updateOrderStatusHandler } from '@/app/api/v1/admin/orders/[id]/status/route';

describe('Admin Order Fulfillment & Tracking Integration Tests (Live PostgreSQL 16)', () => {
  let adminToken: string;
  let orderId: string;
  let orderNumber: string;

  beforeAll(async () => {
    adminToken = await createSessionToken({
      id: 'usr_admin_fulf',
      email: 'admin.fulf@example.in',
      role: 'ADMIN',
      firstName: 'Fulfillment',
      lastName: 'Lead',
    });

    orderNumber = `ORD-FULF-${Date.now()}`;
    const order = await db.order.create({
      data: {
        orderNumber,
        customerName: 'Priya Sharma',
        customerEmail: 'priya.sharma@example.in',
        customerPhone: '9876543210',
        shippingAddressSnapshot: {
          recipientName: 'Priya Sharma',
          streetLine1: 'Flat 402, Lotus Towers',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560001',
          countryCode: 'IN',
        },
        status: OrderStatus.PAID,
        paymentMethod: PaymentProvider.RAZORPAY,
        subtotal: 1270.34,
        taxAmount: 228.66,
        shippingCost: 0.0,
        totalAmount: 1499.0,
        currency: 'INR',
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (orderId) {
      await db.order.delete({ where: { id: orderId } });
    }
  });

  it('lists orders and filters by status via GET /api/v1/admin/orders', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders?status=PAID`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await listOrdersHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const target = body.data.find((o: any) => o.id === orderId);
    expect(target).toBeDefined();
    expect(target.status).toBe('PAID');
  });

  it('retrieves detailed order invoice snapshot via GET /api/v1/admin/orders/:id', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await getOrderHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(orderId);
    expect(body.data.customerEmail).toBe('priya.sharma@example.in');
    expect(body.data.shippingAddress.city).toBe('Bengaluru');
  });

  it('advances order lifecycle state from PAID to PROCESSING', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.PROCESSING }),
    });

    const res = await updateOrderStatusHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PROCESSING');

    const dbOrder = await db.order.findUnique({ where: { id: orderId } });
    expect(dbOrder?.status).toBe(OrderStatus.PROCESSING);
  });

  it('rejects transitioning from PROCESSING to SHIPPED without courier tracking number', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.SHIPPED }), // Missing trackingNumber
    });

    const res = await updateOrderStatusHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('dispatches order to SHIPPED with Delhivery courier tracking number', async () => {
    const carrier = 'Delhivery';
    const trackingNumber = 'DELHIVERY-9988223344';

    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: OrderStatus.SHIPPED,
        carrier,
        trackingNumber,
      }),
    });

    const res = await updateOrderStatusHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('SHIPPED');
    expect(body.data.carrier).toBe(carrier);
    expect(body.data.trackingNumber).toBe(trackingNumber);

    // Verify database persistence in immutable snapshot
    const dbOrder = await db.order.findUnique({ where: { id: orderId } });
    expect(dbOrder?.status).toBe(OrderStatus.SHIPPED);

    const addr = dbOrder?.shippingAddressSnapshot as any;
    expect(addr.carrier).toBe(carrier);
    expect(addr.trackingNumber).toBe(trackingNumber);
    expect(addr.shippedAt).toBeDefined();
  });

  it('rejects invalid backward lifecycle transition from SHIPPED to PENDING', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: OrderStatus.PENDING }),
    });

    const res = await updateOrderStatusHandler(req, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_STATE_TRANSITION');
  });
});
