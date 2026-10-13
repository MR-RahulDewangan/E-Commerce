import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrFulfillment(req);
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { take: 1, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
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

    const addr = (order.shippingAddressSnapshot as Record<string, any>) || {};

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        status: order.status,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        shippingCost: Number(order.shippingCost),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        shippingAddress: addr,
        carrier: addr.carrier || null,
        trackingNumber: addr.trackingNumber || null,
        shippedAt: addr.shippedAt || null,
        items: order.items.map((item) => ({
          id: item.id,
          variantId: item.variantId,
          sku: item.skuSnapshot,
          name: item.nameSnapshot,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          imageUrl: item.variant?.product?.images[0]?.url || null,
        })),
        transactions: order.transactions.map((tx) => ({
          id: tx.id,
          provider: tx.provider,
          gatewayOrderId: tx.gatewayOrderId,
          gatewayPaymentId: tx.gatewayPaymentId,
          status: tx.status,
          amountPaise: tx.amountPaise.toString(),
          createdAt: tx.createdAt.toISOString(),
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin GET order by ID error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order' } },
      { status: 500 }
    );
  }
}
