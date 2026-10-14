import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { POST as createOrderHandler } from '@/app/api/v1/checkout/create-order/route';
import { POST as verifyPaymentHandler } from '@/app/api/v1/checkout/verify-payment/route';
import { POST as addCartItemHandler } from '@/app/api/v1/cart/items/route';
import { CART_SESSION_COOKIE_NAME } from '@/modules/cart/service';
import { OrderStatus, PaymentStatus, ReservationStatus } from '@prisma/client';

describe('Checkout API Integration Tests (Live PostgreSQL 16)', () => {
  let categoryId: string;
  let productId: string;
  let variantStandardId: string;
  let variantExpensiveId: string;
  let variantUnder999Id: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Create User
    const user = await db.user.create({
      data: {
        email: `checkout-tester-${Date.now()}@example.in`,
        firstName: 'Ananya',
        lastName: 'Deshmukh',
        phoneNumber: '+919876543210',
      },
    });
    testUserId = user.id;

    // 2. Create Category
    const category = await db.category.create({
      data: {
        name: 'Checkout Test Category',
        slug: `checkout-cat-${Date.now()}`,
      },
    });
    categoryId = category.id;

    // 3. Create Product
    const product = await db.product.create({
      data: {
        name: 'Festive Banarasi Silk Saree',
        slug: `banarasi-silk-${Date.now()}`,
        description: 'Authentic Banarasi silk saree.',
        basePrice: 1499.0, // ₹1,499.00 -> Free shipping
        isPublished: true,
        categoryId,
      },
    });
    productId = product.id;

    // 4. Create Variants
    // Standard ₹1,499 (149,900 paise)
    const vStd = await db.productVariant.create({
      data: {
        productId,
        sku: `BANARASI-GOLD-${Date.now()}`,
        name: 'Royal Gold',
        stockQuantity: 15,
        priceOverride: null,
      },
    });
    variantStandardId = vStd.id;

    // Expensive ₹6,500 (> ₹5,000 for COD limit testing)
    const vExp = await db.productVariant.create({
      data: {
        productId,
        sku: `BANARASI-DIAMOND-${Date.now()}`,
        name: 'Zari Border Luxury',
        stockQuantity: 5,
        priceOverride: 6500.0,
      },
    });
    variantExpensiveId = vExp.id;

    // Sub-₹999 variant ₹499 (triggers ₹70 delivery charge)
    const vUnder = await db.productVariant.create({
      data: {
        productId,
        sku: `BANARASI-SCARF-${Date.now()}`,
        name: 'Silk Dupatta / Scarf',
        stockQuantity: 20,
        priceOverride: 499.0,
      },
    });
    variantUnder999Id = vUnder.id;
  });

  afterAll(async () => {
    // Teardown created records in safe dependency order
    await db.orderItem.deleteMany({
      where: { variantId: { in: [variantStandardId, variantExpensiveId, variantUnder999Id] } },
    });
    await db.paymentTransaction.deleteMany({
      where: { order: { customerEmail: { contains: 'checkout-tester' } } },
    });
    await db.stockReservation.deleteMany({
      where: { variantId: { in: [variantStandardId, variantExpensiveId, variantUnder999Id] } },
    });
    await db.order.deleteMany({
      where: { customerEmail: { contains: 'checkout-tester' } },
    });
    await db.cartItem.deleteMany({
      where: { variantId: { in: [variantStandardId, variantExpensiveId, variantUnder999Id] } },
    });
    await db.cart.deleteMany({
      where: { userId: testUserId },
    });
    await db.productVariant.deleteMany({
      where: { id: { in: [variantStandardId, variantExpensiveId, variantUnder999Id] } },
    });
    await db.product.deleteMany({ where: { id: productId } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.user.deleteMany({ where: { id: testUserId } });
  });

  it('Scenario A: Full Cart-to-Order Flow with MOCK payment and verification', async () => {
    const sessionToken = `test_cart_session_${Date.now()}`;

    // 1. Add item to cart
    const addReq = new NextRequest('http://localhost:3000/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${CART_SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      body: JSON.stringify({
        variantId: variantStandardId,
        quantity: 1,
      }),
    });
    const addRes = await addCartItemHandler(addReq);
    expect(addRes.status).toBe(200);

    // 2. Call create-order with valid Indian address and MOCK payment method
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${CART_SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-ananya@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'Flat 402, Lotus Apartments, 12th Cross',
          streetLine2: 'Indiranagar',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560038',
          countryCode: 'IN',
        },
        paymentMethod: 'MOCK',
      }),
    });

    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.data.orderId).toBeDefined();
    expect(createData.data.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    expect(createData.data.gatewayOrderId).toBeDefined();
    // ₹1,499.00 = 149900 paise (above ₹999 -> free shipping)
    expect(createData.data.amountPaise).toBe(149900);
    expect(createData.data.paymentMethod).toBe('MOCK');
    expect(createData.data.keyId).toBe('mock_publishable_key');

    const orderId = createData.data.orderId;
    const gatewayOrderId = createData.data.gatewayOrderId;

    // 3. Verify Database state: Order in PENDING status, address snapshot saved
    const orderInDb = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true, reservations: true, transactions: true },
    });
    expect(orderInDb).not.toBeNull();
    expect(orderInDb?.status).toBe(OrderStatus.PENDING);
    expect(Number(orderInDb?.totalAmount)).toBe(1499.0);
    expect(Number(orderInDb?.shippingCost)).toBe(0.0); // Free shipping threshold met
    expect((orderInDb?.shippingAddressSnapshot as any).city).toBe('Bengaluru');
    expect((orderInDb?.shippingAddressSnapshot as any).postalCode).toBe('560038');

    // 4. Verify Stock Reservation was created and linked to this order
    const reservations = await db.stockReservation.findMany({
      where: { orderId },
    });
    expect(reservations.length).toBe(1);
    expect(reservations[0].status).toBe(ReservationStatus.HELD);
    expect(reservations[0].quantity).toBe(1);

    // 5. Verify customer's cart was emptied after checkout order creation
    const cartItems = await db.cartItem.findMany({
      where: { cart: { sessionToken } },
    });
    expect(cartItems.length).toBe(0);

    // 6. Verify Payment Callback: verify-payment with valid mock signature
    const verifyReq = new NextRequest('http://localhost:3000/api/v1/checkout/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId,
        gatewayOrderId,
        gatewayPaymentId: 'mock_pay_success_123',
        signature: 'mock_valid_signature',
      }),
    });

    const verifyRes = await verifyPaymentHandler(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.data.orderNumber).toBe(orderInDb?.orderNumber);
    expect(verifyData.data.status).toBe(OrderStatus.PAID);
    expect(verifyData.data.totalAmount).toBe(1499.0);

    // 7. Verify Database state after payment verification:
    // Order is PAID, Reservation is CONSUMED, PaymentTransaction is SUCCEEDED
    const updatedOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { reservations: true, transactions: true },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.PAID);
    expect(updatedOrder?.reservations[0].status).toBe(ReservationStatus.CONSUMED);
    expect(updatedOrder?.transactions[0].status).toBe(PaymentStatus.SUCCEEDED);
    expect(updatedOrder?.transactions[0].gatewayPaymentId).toBe('mock_pay_success_123');
  });

  it('Scenario B: Idempotent Payment Verification', async () => {
    // 1. Create order
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-idempotent@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'MG Road',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560001',
          countryCode: 'IN',
        },
        paymentMethod: 'MOCK',
        items: [{ variantId: variantStandardId, quantity: 1 }],
      }),
    });
    const createRes = await createOrderHandler(createReq);
    const createData = await createRes.json();
    const { orderId, gatewayOrderId } = createData.data;

    // 2. First verification
    const verifyReq1 = new NextRequest('http://localhost:3000/api/v1/checkout/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId,
        gatewayOrderId,
        gatewayPaymentId: 'mock_pay_idem_1',
        signature: 'mock_valid_signature',
      }),
    });
    const verifyRes1 = await verifyPaymentHandler(verifyReq1);
    expect(verifyRes1.status).toBe(200);

    // 3. Second verification (idempotent call)
    const verifyReq2 = new NextRequest('http://localhost:3000/api/v1/checkout/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId,
        gatewayOrderId,
        gatewayPaymentId: 'mock_pay_idem_1',
        signature: 'mock_valid_signature',
      }),
    });
    const verifyRes2 = await verifyPaymentHandler(verifyReq2);
    expect(verifyRes2.status).toBe(200);
    const verifyData2 = await verifyRes2.json();
    expect(verifyData2.data.status).toBe('PAID');
  });

  it('Scenario C: Rejects Invalid Cryptographic Signature', async () => {
    // 1. Create order
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-tamper@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'Brigade Road',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560025',
          countryCode: 'IN',
        },
        paymentMethod: 'MOCK',
        items: [{ variantId: variantStandardId, quantity: 1 }],
      }),
    });
    const createRes = await createOrderHandler(createReq);
    const createData = await createRes.json();
    const { orderId, gatewayOrderId } = createData.data;

    // 2. Submit bad signature
    const verifyReq = new NextRequest('http://localhost:3000/api/v1/checkout/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId,
        gatewayOrderId,
        gatewayPaymentId: 'mock_pay_bad_sig',
        signature: 'forged_or_invalid_signature_hex_value',
      }),
    });
    const verifyRes = await verifyPaymentHandler(verifyReq);
    expect(verifyRes.status).toBe(400);
    const verifyData = await verifyRes.json();
    expect(verifyData.error.code).toBe('INVALID_PAYMENT_SIGNATURE');

    // 3. Confirm order remained in PENDING status
    const order = await db.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PENDING);
  });

  it('Scenario D: Cash on Delivery (COD) Order Flow with Shipping Calculation', async () => {
    // variantUnder999 is ₹499 (< ₹999 threshold -> ₹70 delivery charge applies)
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-cod@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'Koramangala 4th Block',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560034',
          countryCode: 'IN',
        },
        paymentMethod: 'COD',
        items: [{ variantId: variantUnder999Id, quantity: 1 }],
      }),
    });

    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    // Subtotal: ₹499 (49,900 paise) + Shipping: ₹70 (7,000 paise) = ₹569 (56,900 paise)
    expect(createData.data.amountPaise).toBe(56900);
    expect(createData.data.paymentMethod).toBe('COD');
    expect(createData.data.gatewayOrderId).toMatch(/^cod_order_/);

    const orderId = createData.data.orderId;
    const orderInDb = await db.order.findUnique({
      where: { id: orderId },
      include: { reservations: true },
    });
    // COD orders start in AWAITING_PAYMENT state and secure stock immediately
    expect(orderInDb?.status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(Number(orderInDb?.shippingCost)).toBe(70.0);
    expect(Number(orderInDb?.totalAmount)).toBe(569.0);
    expect(orderInDb?.reservations[0].status).toBe(ReservationStatus.CONSUMED);
  });

  it('Scenario E: Rejects COD when order amount exceeds ₹5,000 limit', async () => {
    // variantExpensive is ₹6,500 (> ₹5,000 limit)
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-expensive-cod@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'Whitefield',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560066',
          countryCode: 'IN',
        },
        paymentMethod: 'COD',
        items: [{ variantId: variantExpensiveId, quantity: 1 }],
      }),
    });

    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(400);
    const createData = await createRes.json();
    expect(createData.error.code).toBe('COD_LIMIT_EXCEEDED');
    expect(createData.error.message).toContain('Cash on Delivery is only available for orders up to ₹5,000');
  });

  it('Scenario F: Rejects checkout with empty cart', async () => {
    const emptySessionToken = `empty_cart_${Date.now()}`;
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${CART_SESSION_COOKIE_NAME}=${emptySessionToken}`,
      },
      body: JSON.stringify({
        customer: {
          name: 'Ananya Deshmukh',
          email: 'checkout-tester-empty@example.in',
          phone: '+919876543210',
        },
        shippingAddress: {
          recipientName: 'Ananya Deshmukh',
          phoneNumber: '+919876543210',
          streetLine1: 'Whitefield',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '560066',
          countryCode: 'IN',
        },
        paymentMethod: 'MOCK',
      }),
    });

    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(400);
    const createData = await createRes.json();
    expect(createData.error.code).toBe('EMPTY_CART');
  });

  it('Scenario G: Rejects checkout with invalid Indian PIN code and phone number', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Pooja Sharma',
          email: 'pooja@example.in',
          phone: '12345', // Invalid phone
        },
        shippingAddress: {
          recipientName: 'Pooja Sharma',
          phoneNumber: '12345',
          streetLine1: 'Indiranagar 100ft Road',
          city: 'Bengaluru',
          stateProvince: 'Karnataka',
          postalCode: '012345', // Starts with 0 (invalid Indian PIN)
          countryCode: 'IN',
        },
        paymentMethod: 'MOCK',
        items: [{ variantId: variantStandardId, quantity: 1 }],
      }),
    });

    const createRes = await createOrderHandler(createReq);
    expect(createRes.status).toBe(422);
    const createData = await createRes.json();
    expect(createData.error.code).toBe('VALIDATION_ERROR');
    expect(createData.error.details.length).toBeGreaterThan(0);
  });
});
