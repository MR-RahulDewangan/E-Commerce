import crypto from 'node:crypto';
import { db } from '@/lib/db';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ReservationStatus,
} from '@prisma/client';
import {
  CreateCheckoutOrderInput,
  VerifyPaymentInput,
} from './validation';
import { calculateCartPricing } from '@/modules/cart/pricing';
import { getCartDetails } from '@/modules/cart/service';
import {
  reserveStockForCheckout,
  releaseReservationsBySession,
  consumeReservationsByOrderId,
  InventoryError,
} from '@/modules/inventory/reservation';
import { getPaymentGateway } from '@/modules/payment/gateway';
import { assertValidTransition } from '@/modules/order/state-machine';

export const MAX_COD_AMOUNT_PAISE = 500000; // ₹5,000.00 maximum for Cash On Delivery

export class CheckoutError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'CheckoutError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Generate unique, enterprise-standard Indian order number.
 * Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20261013-A1B2)
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
}

export interface CheckoutOrderResult {
  orderId: string;
  orderNumber: string;
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  paymentMethod: PaymentProvider;
  keyId?: string;
}

export interface VerifyPaymentResult {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
}

/**
 * Creates an immutable order, reserves inventory atomically, clears cart,
 * and initiates payment intent through the specified payment gateway.
 */
export async function createCheckoutOrder(
  input: CreateCheckoutOrderInput,
  options?: {
    sessionUserId?: string;
    cookieCartSessionToken?: string;
  }
): Promise<CheckoutOrderResult> {
  // 1. Determine checkout line items
  let checkoutCartId: string | null = null;
  let pricingItems: Array<{
    variantId: string;
    name: string;
    sku: string;
    unitPricePaise: number;
    quantity: number;
  }> = [];

  if (input.items && input.items.length > 0) {
    // Direct "Buy Now" checkout with explicit items
    const variantIds = input.items.map((i) => i.variantId);
    const variants = await db.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    for (const item of input.items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new CheckoutError(
          `Product variant with ID ${item.variantId} was not found.`,
          'VARIANT_NOT_FOUND',
          404
        );
      }
      if (!variant.product.isPublished) {
        throw new CheckoutError(
          `Product "${variant.product.name}" is not currently available for purchase.`,
          'PRODUCT_UNAVAILABLE',
          400
        );
      }

      const basePricePaise = Math.round(Number(variant.product.basePrice) * 100);
      const unitPricePaise =
        variant.priceOverride !== null
          ? Math.round(Number(variant.priceOverride) * 100)
          : basePricePaise;

      pricingItems.push({
        variantId: variant.id,
        name: `${variant.product.name} - ${variant.name}`,
        sku: variant.sku,
        unitPricePaise,
        quantity: item.quantity,
      });
    }
  } else {
    // Standard cart-based checkout
    const cartSessionToken = input.cartSessionToken || options?.cookieCartSessionToken;
    const cart = await getCartDetails(
      cartSessionToken,
      options?.sessionUserId,
      input.shippingAddress.stateProvince
    );

    if (!cart.items || cart.items.length === 0) {
      throw new CheckoutError('Cannot checkout with an empty cart.', 'EMPTY_CART', 400);
    }

    const outOfStockItem = cart.items.find((item) => !item.isAvailable);
    if (outOfStockItem) {
      throw new CheckoutError(
        `Item "${outOfStockItem.name}" is no longer available in the requested quantity.`,
        'INSUFFICIENT_STOCK',
        409
      );
    }

    checkoutCartId = cart.id;
    pricingItems = cart.items.map((item) => ({
      variantId: item.variantId,
      name: `${item.productName} - ${item.name}`,
      sku: item.sku,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
    }));
  }

  // 2. Compute server-authoritative GST & delivery pricing
  const pricing = calculateCartPricing({
    items: pricingItems,
    destinationState: input.shippingAddress.stateProvince,
  });

  // 3. Enforce Cash on Delivery limits
  if (input.paymentMethod === 'COD' && pricing.totalPayablePaise > MAX_COD_AMOUNT_PAISE) {
    throw new CheckoutError(
      'Cash on Delivery is only available for orders up to ₹5,000. Please select an online payment method.',
      'COD_LIMIT_EXCEEDED',
      400
    );
  }

  // 4. Concurrency-safe atomic stock reservation hold
  const reservationSessionToken = `res_sess_${crypto.randomBytes(16).toString('hex')}`;
  try {
    await reserveStockForCheckout(
      reservationSessionToken,
      pricingItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }))
    );
  } catch (err) {
    if (err instanceof InventoryError) {
      throw new CheckoutError(err.message, err.code, err.statusCode);
    }
    throw err;
  }

  // 5. Transactionally create Order, OrderItems, link reservations & clear cart
  let orderNumber = generateOrderNumber();
  const initialStatus =
    input.paymentMethod === 'COD' ? OrderStatus.AWAITING_PAYMENT : OrderStatus.PENDING;

  let createdOrder;
  try {
    createdOrder = await db.$transaction(async (tx) => {
      // Ensure orderNumber is unique
      let attempts = 0;
      while (attempts < 5) {
        const existing = await tx.order.findUnique({ where: { orderNumber } });
        if (!existing) break;
        orderNumber = generateOrderNumber();
        attempts++;
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: options?.sessionUserId || null,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          shippingAddressSnapshot: input.shippingAddress,
          status: initialStatus,
          paymentMethod: input.paymentMethod,
          subtotal: pricing.subtotalAfterDiscountPaise / 100,
          taxAmount: pricing.tax.totalGstPaise / 100,
          shippingCost: pricing.shippingFeePaise / 100,
          discountAmount: pricing.discountPaise / 100,
          totalAmount: pricing.totalPayablePaise / 100,
          currency: 'INR',
        },
      });

      // Insert OrderItem records with immutable name/sku snapshots
      for (const item of pricingItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            skuSnapshot: item.sku,
            nameSnapshot: item.name,
            unitPrice: item.unitPricePaise / 100,
            quantity: item.quantity,
          },
        });
      }

      // Link held stock reservations to this specific order
      await tx.stockReservation.updateMany({
        where: { sessionToken: reservationSessionToken },
        data: { orderId: order.id },
      });

      // Clear customer's cart
      if (checkoutCartId) {
        await tx.cartItem.deleteMany({
          where: { cartId: checkoutCartId },
        });
      }

      return order;
    });
  } catch (error) {
    // If order creation fails, immediately release stock reservations
    await releaseReservationsBySession(reservationSessionToken);
    throw error;
  }

  // 6. Initiate Payment Gateway Order
  const gateway = getPaymentGateway(input.paymentMethod);
  const gatewayResult = await gateway.createOrder({
    orderId: createdOrder.id,
    orderNumber: createdOrder.orderNumber,
    amountPaise: pricing.totalPayablePaise,
    currency: 'INR',
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
    },
  });

  // 7. Persist Payment Transaction record
  await db.paymentTransaction.create({
    data: {
      orderId: createdOrder.id,
      provider: input.paymentMethod,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      idempotencyKey: `tx_${createdOrder.id}_${gatewayResult.gatewayOrderId}`,
      status: PaymentStatus.INITIATED,
      amountPaise: BigInt(pricing.totalPayablePaise),
      currency: 'INR',
      rawResponse: gatewayResult as any,
    },
  });

  // For COD orders, reservations are immediately consumed as order is placed
  if (input.paymentMethod === 'COD') {
    await consumeReservationsByOrderId(createdOrder.id);
  }

  return {
    orderId: createdOrder.id,
    orderNumber: createdOrder.orderNumber,
    gatewayOrderId: gatewayResult.gatewayOrderId,
    amountPaise: pricing.totalPayablePaise,
    currency: 'INR',
    paymentMethod: input.paymentMethod,
    keyId: gatewayResult.keyId,
  };
}

/**
 * Validates cryptographic signature from payment gateway, marks Order as PAID,
 * consumes stock reservations permanently, and records successful transaction.
 */
export async function verifyCheckoutPayment(
  input: VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  // 1. Locate Order
  const order = await db.order.findFirst({
    where: {
      OR: [{ id: input.orderId }, { orderNumber: input.orderId }],
    },
    include: { transactions: true },
  });

  if (!order) {
    throw new CheckoutError(`Order '${input.orderId}' was not found.`, 'ORDER_NOT_FOUND', 404);
  }

  // 2. Idempotent check: If order is already PAID, return clean success immediately
  if (order.status === OrderStatus.PAID) {
    return {
      orderNumber: order.orderNumber,
      status: OrderStatus.PAID,
      totalAmount: Number(order.totalAmount),
    };
  }

  // 3. Ensure order state transition to PAID is valid
  assertValidTransition(order.status, OrderStatus.PAID);

  // 4. Cryptographically verify signature via payment gateway
  const gateway = getPaymentGateway(order.paymentMethod);
  const isValidSignature = await gateway.verifyPayment({
    gatewayOrderId: input.gatewayOrderId,
    gatewayPaymentId: input.gatewayPaymentId,
    signature: input.signature,
  });

  if (!isValidSignature) {
    // Record failed attempt
    await db.paymentTransaction.updateMany({
      where: { orderId: order.id, gatewayOrderId: input.gatewayOrderId },
      data: { status: PaymentStatus.FAILED },
    });

    throw new CheckoutError(
      'Payment verification failed: Invalid cryptographic signature.',
      'INVALID_PAYMENT_SIGNATURE',
      400
    );
  }

  // 5. Transactionally mark order as PAID and finalize inventory decrement
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    await tx.paymentTransaction.updateMany({
      where: { orderId: order.id, gatewayOrderId: input.gatewayOrderId },
      data: {
        gatewayPaymentId: input.gatewayPaymentId,
        status: PaymentStatus.SUCCEEDED,
        rawResponse: {
          gatewayOrderId: input.gatewayOrderId,
          gatewayPaymentId: input.gatewayPaymentId,
          signature: input.signature,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    // Finalize stock reservation to CONSUMED
    await tx.stockReservation.updateMany({
      where: {
        orderId: order.id,
        status: ReservationStatus.HELD,
      },
      data: {
        status: ReservationStatus.CONSUMED,
      },
    });
  });

  return {
    orderNumber: order.orderNumber,
    status: OrderStatus.PAID,
    totalAmount: Number(order.totalAmount),
  };
}
