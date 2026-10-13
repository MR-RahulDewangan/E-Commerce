import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';
import { OrderStatus } from '@prisma/client';
import {
  assertValidTransition,
  InvalidOrderStateTransitionError,
} from '@/modules/order/state-machine';

const updateOrderStatusSchema = z
  .object({
    status: z.nativeEnum(OrderStatus),
    carrier: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.status === OrderStatus.SHIPPED) {
        return Boolean(data.trackingNumber && data.trackingNumber.length >= 3);
      }
      return true;
    },
    {
      message: 'A valid courier tracking number is required when transitioning an order to SHIPPED.',
      path: ['trackingNumber'],
    }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrFulfillment(req);
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    const rawBody = await req.json();
    const parsed = updateOrderStatusSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { status: targetStatus, carrier, trackingNumber } = parsed.data;

    // Validate state machine rule
    try {
      assertValidTransition(order.status, targetStatus);
    } catch (transErr) {
      if (transErr instanceof InvalidOrderStateTransitionError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE_TRANSITION',
              message: transErr.message,
              currentStatus: transErr.currentStatus,
              targetStatus: transErr.targetStatus,
            },
          },
          { status: 400 }
        );
      }
      throw transErr;
    }

    // Prepare updated address snapshot
    const currentAddress = (order.shippingAddressSnapshot as Record<string, any>) || {};
    const updatedAddress = {
      ...currentAddress,
      ...(carrier !== undefined && { carrier }),
      ...(trackingNumber !== undefined && { trackingNumber }),
      ...(targetStatus === OrderStatus.SHIPPED && { shippedAt: new Date().toISOString() }),
    };

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: targetStatus,
        shippingAddressSnapshot: updatedAddress,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        carrier: updatedAddress.carrier || null,
        trackingNumber: updatedAddress.trackingNumber || null,
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin PATCH order status error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update order status' } },
      { status: 500 }
    );
  }
}
