import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { OrderStatus, PaymentStatus, ReservationStatus } from '@prisma/client';
import { timingSafeCompare } from '@/modules/auth/crypto';
import { assertValidTransition } from '@/modules/order/state-machine';

export class WebhookError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates inbound Razorpay webhook cryptographic HMAC-SHA256 signature against raw request body.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretOverride?: string
): boolean {
  if (!signature || !rawBody) {
    return false;
  }

  const webhookSecret =
    secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_123';

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return timingSafeCompare(expectedSignature, signature);
}

export interface WebhookProcessResult {
  received: boolean;
  processed: boolean;
  orderNumber?: string;
  event: string;
}

/**
 * Idempotently ingests and processes Razorpay webhook events.
 * Guarantees zero duplicate order transitions or stock mutations on replayed events.
 */
export async function processRazorpayWebhook(
  rawBody: string,
  signature: string | null | undefined
): Promise<WebhookProcessResult> {
  // 1. Cryptographic HMAC validation
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new WebhookError(
      'Invalid Razorpay webhook signature.',
      'INVALID_WEBHOOK_SIGNATURE',
      400
    );
  }

  // 2. Parse payload safely
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookError('Malformed JSON webhook payload.', 'INVALID_PAYLOAD', 400);
  }

  const event = payload.event;
  if (!event) {
    throw new WebhookError('Missing webhook event field.', 'INVALID_EVENT', 400);
  }

  // 3. Handle payment.captured or order.paid events
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const gatewayPaymentId = paymentEntity?.id;
    const notesOrderId = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

    if (!gatewayOrderId && !notesOrderId) {
      return { received: true, processed: false, event };
    }

    // Locate the order
    const order = await db.order.findFirst({
      where: {
        OR: [
          ...(notesOrderId ? [{ id: notesOrderId }, { orderNumber: notesOrderId }] : []),
          ...(gatewayOrderId
            ? [{ transactions: { some: { gatewayOrderId } } }]
            : []),
        ],
      },
      include: { transactions: true, reservations: true },
    });

    if (!order) {
      // Order might be for another environment or not found
      return { received: true, processed: false, event };
    }

    // IDEMPOTENCY CHECK: If order is already PAID, acknowledge without re-mutating
    if (order.status === OrderStatus.PAID) {
      return {
        received: true,
        processed: false,
        orderNumber: order.orderNumber,
        event,
      };
    }

    // Transition state safely
    assertValidTransition(order.status, OrderStatus.PAID);

    // Apply database updates transactionally
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      if (gatewayOrderId) {
        await tx.paymentTransaction.updateMany({
          where: { orderId: order.id, gatewayOrderId },
          data: {
            ...(gatewayPaymentId ? { gatewayPaymentId } : {}),
            status: PaymentStatus.SUCCEEDED,
            rawResponse: payload,
          },
        });
      }

      // Finalize stock reservation holds to CONSUMED
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
      received: true,
      processed: true,
      orderNumber: order.orderNumber,
      event,
    };
  }

  // 4. Handle payment.failed event
  if (event === 'payment.failed') {
    const paymentEntity = payload.payload?.payment?.entity;
    const gatewayOrderId = paymentEntity?.order_id;
    if (gatewayOrderId) {
      await db.paymentTransaction.updateMany({
        where: { gatewayOrderId },
        data: {
          status: PaymentStatus.FAILED,
          rawResponse: payload,
        },
      });
    }

    return { received: true, processed: true, event };
  }

  // Acknowledge unhandled event types without error
  return { received: true, processed: false, event };
}
