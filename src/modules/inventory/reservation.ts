import { db } from '@/lib/db';
import { StockReservation, ReservationStatus } from '@prisma/client';

export const RESERVATION_HOLD_MINUTES = 10;

export class InventoryError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ReservationItemInput {
  variantId: string;
  quantity: number;
}

/**
 * Atomically reserves inventory using conditional SQL updates within a transaction.
 * Guarantees zero overselling under high concurrency.
 */
export async function reserveStockForCheckout(
  sessionToken: string,
  items: ReservationItemInput[]
): Promise<StockReservation[]> {
  if (!items || items.length === 0) {
    throw new InventoryError('Cannot reserve stock for empty items list.', 'INVALID_ITEMS', 400);
  }

  const expiresAt = new Date(Date.now() + RESERVATION_HOLD_MINUTES * 60 * 1000);

  return db.$transaction(async (tx) => {
    const reservations: StockReservation[] = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new InventoryError('Quantity must be greater than zero.', 'INVALID_QUANTITY', 400);
      }

      // Atomic conditional update: only decrements if "stockQuantity" >= requested quantity
      const rowsUpdated = await tx.$executeRaw`
        UPDATE product_variants
        SET "stockQuantity" = "stockQuantity" - ${item.quantity}
        WHERE id = ${item.variantId} AND "stockQuantity" >= ${item.quantity}
      `;

      if (rowsUpdated === 0) {
        throw new InventoryError(
          `Insufficient stock available for variant ${item.variantId}.`,
          'INSUFFICIENT_STOCK',
          409
        );
      }

      // Record reservation hold
      const reservation = await tx.stockReservation.create({
        data: {
          variantId: item.variantId,
          sessionToken,
          quantity: item.quantity,
          status: ReservationStatus.HELD,
          expiresAt,
        },
      });

      reservations.push(reservation);
    }

    return reservations;
  });
}

/**
 * Releases held stock for an entire checkout session (e.g. if customer abandons or cancels checkout).
 */
export async function releaseReservationsBySession(sessionToken: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const held = await tx.stockReservation.findMany({
      where: {
        sessionToken,
        status: ReservationStatus.HELD,
      },
    });

    for (const r of held) {
      await tx.$executeRaw`
        UPDATE product_variants
        SET "stockQuantity" = "stockQuantity" + ${r.quantity}
        WHERE id = ${r.variantId}
      `;

      await tx.stockReservation.update({
        where: { id: r.id },
        data: { status: ReservationStatus.RELEASED },
      });
    }

    return held.length;
  });
}

/**
 * Reconciles and releases all expired holds (runs periodically via cron/worker).
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  return db.$transaction(async (tx) => {
    const expired = await tx.stockReservation.findMany({
      where: {
        status: ReservationStatus.HELD,
        expiresAt: { lte: now },
      },
    });

    for (const r of expired) {
      await tx.$executeRaw`
        UPDATE product_variants
        SET "stockQuantity" = "stockQuantity" + ${r.quantity}
        WHERE id = ${r.variantId}
      `;

      await tx.stockReservation.update({
        where: { id: r.id },
        data: { status: ReservationStatus.RELEASED },
      });
    }

    return expired.length;
  });
}

/**
 * Marks reservations as CONSUMED and associates the final order ID upon successful payment.
 */
export async function consumeReservationsForOrder(
  sessionToken: string,
  orderId: string
): Promise<number> {
  return db.$transaction(async (tx) => {
    const result = await tx.stockReservation.updateMany({
      where: {
        sessionToken,
        status: ReservationStatus.HELD,
      },
      data: {
        status: ReservationStatus.CONSUMED,
        orderId,
      },
    });

    return result.count;
  });
}

/**
 * Links held reservations to an order ID without consuming them yet.
 */
export async function linkReservationsToOrder(
  sessionToken: string,
  orderId: string
): Promise<number> {
  return db.$transaction(async (tx) => {
    const result = await tx.stockReservation.updateMany({
      where: {
        sessionToken,
        status: ReservationStatus.HELD,
      },
      data: {
        orderId,
      },
    });

    return result.count;
  });
}

/**
 * Marks held reservations for a specific order as CONSUMED.
 */
export async function consumeReservationsByOrderId(orderId: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const result = await tx.stockReservation.updateMany({
      where: {
        orderId,
        status: ReservationStatus.HELD,
      },
      data: {
        status: ReservationStatus.CONSUMED,
      },
    });

    return result.count;
  });
}

/**
 * Releases held stock reservations associated with an order (e.g. on checkout failure or cancellation).
 */
export async function releaseReservationsByOrderId(orderId: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const held = await tx.stockReservation.findMany({
      where: {
        orderId,
        status: ReservationStatus.HELD,
      },
    });

    for (const r of held) {
      await tx.$executeRaw`
        UPDATE product_variants
        SET "stockQuantity" = "stockQuantity" + ${r.quantity}
        WHERE id = ${r.variantId}
      `;

      await tx.stockReservation.update({
        where: { id: r.id },
        data: { status: ReservationStatus.RELEASED },
      });
    }

    return held.length;
  });
}
