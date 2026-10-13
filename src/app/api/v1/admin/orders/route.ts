import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminOrFulfillment } from '@/modules/auth/guards';
import { AuthError } from '@/modules/auth/service';
import { OrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrFulfillment(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const statusFilter = searchParams.get('status') as OrderStatus | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (statusFilter && Object.values(OrderStatus).includes(statusFilter)) {
      whereClause.status = statusFilter;
    }
    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where: whereClause,
        include: {
          items: true,
          transactions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where: whereClause }),
    ]);

    const formatted = orders.map((o) => {
      const addr = (o.shippingAddressSnapshot as Record<string, any>) || {};

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        status: o.status,
        paymentMethod: o.paymentMethod,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.taxAmount),
        shippingCost: Number(o.shippingCost),
        totalAmount: Number(o.totalAmount),
        currency: o.currency,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        items: o.items.map((item) => ({
          id: item.id,
          variantId: item.variantId,
          sku: item.skuSnapshot,
          name: item.nameSnapshot,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
        })),
        shippingAddress: addr,
        carrier: addr.carrier || null,
        trackingNumber: addr.trackingNumber || null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error('Admin GET orders error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve orders' } },
      { status: 500 }
    );
  }
}
