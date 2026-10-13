import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';
import { getPaymentGateway } from '@/modules/payment/gateway';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import crypto from 'node:crypto';

const refundOrderSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(3, 'A reason of at least 3 characters is mandatory').default('Customer refund'),
  restockInventory: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminOrFulfillment(req);
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    if (order.status === OrderStatus.REFUNDED) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_REFUNDED', message: 'Order has already been fully refunded.' } },
        { status: 400 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = refundOrderSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund payload',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const orderTotalPaise = Math.round(Number(order.totalAmount) * 100);
    const refundAmountPaise = parsed.data.amountPaise || orderTotalPaise;
    const { reason, restockInventory } = parsed.data;

    if (refundAmountPaise > orderTotalPaise) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXCESSIVE_REFUND',
            message: `Refund amount (${refundAmountPaise} paise) cannot exceed total order value (${orderTotalPaise} paise).`,
          },
        },
        { status: 400 }
      );
    }

    // Identify successful transaction
    const successfulTx = order.transactions.find((tx) => tx.status === PaymentStatus.SUCCEEDED) || order.transactions[0];
    const gatewayPaymentId = successfulTx?.gatewayPaymentId || `pay_mock_${order.id.slice(0, 8)}`;
    const provider = successfulTx?.provider || (order.paymentMethod as any) || 'MOCK';

    // Call payment gateway
    const gateway = getPaymentGateway(provider);
    const refundResult = await gateway.processRefund({
      gatewayPaymentId,
      amountPaise: refundAmountPaise,
      reason,
    });

    if (refundResult.status !== 'PROCESSED') {
      return NextResponse.json(
        { success: false, error: { code: 'GATEWAY_ERROR', message: 'Payment gateway rejected refund request.' } },
        { status: 502 }
      );
    }

    // Perform database transaction: record refund transaction, update order, and optionally restock
    const result = await db.$transaction(async (tx) => {
      // 1. Record payment transaction entry
      const refundTx = await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider,
          gatewayOrderId: successfulTx?.gatewayOrderId || `ord_${order.id}`,
          gatewayPaymentId: refundResult.refundId,
          idempotencyKey: `ref_${order.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          status: PaymentStatus.REFUNDED,
          amountPaise: BigInt(refundAmountPaise),
          currency: 'INR',
          rawResponse: {
            refundId: refundResult.refundId,
            reason,
            initiatedBy: user.email,
            initiatedByName: `${user.firstName} ${user.lastName}`,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 2. If full refund, mark order as REFUNDED
      const isFullRefund = refundAmountPaise >= orderTotalPaise;
      let updatedStatus = order.status;
      if (isFullRefund) {
        updatedStatus = OrderStatus.REFUNDED;
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.REFUNDED },
        });
      }

      // 3. Reconcile / restock inventory if selected
      let restockedCount = 0;
      if (restockInventory) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (variant) {
            const currentAttrs = (variant.attributes as Record<string, any>) || {};
            const existingLogs = Array.isArray(currentAttrs.auditLog) ? currentAttrs.auditLog : [];
            const newAudit = {
              delta: item.quantity,
              previousStock: variant.stockQuantity,
              newStock: variant.stockQuantity + item.quantity,
              reason: `Refund restocking for Order ${order.orderNumber} (${reason})`,
              adjustedBy: user.email,
              adjustedByName: `${user.firstName} ${user.lastName}`,
              timestamp: new Date().toISOString(),
            };

            const updatedAttrs = {
              ...currentAttrs,
              auditLog: [...existingLogs, newAudit],
            };

            await tx.$executeRaw`
              UPDATE product_variants
              SET "stockQuantity" = "stockQuantity" + ${item.quantity},
                  "attributes" = ${JSON.stringify(updatedAttrs)}::jsonb
              WHERE id = ${item.variantId}
            `;
            restockedCount += item.quantity;
          }
        }
      }

      return {
        refundId: refundResult.refundId,
        refundTransactionId: refundTx.id,
        amountPaise: refundAmountPaise,
        orderStatus: updatedStatus,
        restockedCount,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed refund of ₹${(refundAmountPaise / 100).toFixed(2)}${
        result.restockedCount > 0 ? ` and reinstated ${result.restockedCount} units of stock` : ''
      }.`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundId: result.refundId,
        amountPaise: result.amountPaise,
        orderStatus: result.orderStatus,
        restockedCount: result.restockedCount,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin POST order refund error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to process refund' } },
      { status: 500 }
    );
  }
}
