import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { db } from '@/lib/db';
import { isEligibleForCancellation, assertValidTransition } from '@/modules/order/state-machine';
import { OrderStatus, ReservationStatus } from '@prisma/client';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to cancel an order.',
        status: 401,
      });
    }

    const { id } = await params;

    // Locate the order and verify ownership
    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        AND: {
          OR: [{ userId: user.id }, { customerEmail: user.email }],
        },
      },
      include: { items: true },
    });

    if (!order) {
      return apiError({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found or access denied.',
        status: 404,
      });
    }

    if (!isEligibleForCancellation(order.status)) {
      return apiError({
        code: 'NOT_ELIGIBLE_FOR_CANCELLATION',
        message: `Order cannot be cancelled in status '${order.status}'. Only PENDING, AWAITING_PAYMENT, or PAID orders prior to shipping can be cancelled.`,
        status: 400,
      });
    }

    assertValidTransition(order.status, OrderStatus.CANCELLED);

    // Cancel order and restock inventory transactionally
    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      // 2. Restock variants
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE product_variants
          SET "stockQuantity" = "stockQuantity" + ${item.quantity}
          WHERE id = ${item.variantId}
        `;
      }

      // 3. Update reservations to RELEASED if any were held
      await tx.stockReservation.updateMany({
        where: { orderId: order.id, status: ReservationStatus.HELD },
        data: { status: ReservationStatus.RELEASED },
      });
    });

    return apiSuccess(
      {
        data: {
          orderNumber: order.orderNumber,
          status: OrderStatus.CANCELLED,
          message: 'Order successfully cancelled and inventory restocked.',
        },
      },
      200
    );
  } catch (error) {
    console.error('Unhandled cancelOrder error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to cancel order.',
      status: 500,
    });
  }
}
