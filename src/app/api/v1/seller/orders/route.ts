import { NextRequest, NextResponse } from 'next/server';
import { requireSellerOrAdmin } from '@/modules/auth/guards';
import { getSellerProfile, getSellerOrders } from '@/modules/seller/service';
import { AuthError } from '@/modules/auth/service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireSellerOrAdmin(req);
    const profile = await getSellerProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found' } },
        { status: 404 }
      );
    }

    const orders = await getSellerOrders(profile.id);

    // Format orders for seller view with seller-specific item subtotal
    const formattedOrders = orders.map((order) => {
      const sellerItemsTotal = order.items.reduce(
        (acc, item) => acc + Number(item.unitPrice) * item.quantity,
        0
      );

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        sellerItemsTotal,
        items: order.items.map((i) => ({
          id: i.id,
          sku: i.skuSnapshot,
          name: i.nameSnapshot,
          unitPrice: Number(i.unitPrice),
          quantity: i.quantity,
          lineTotal: Number(i.unitPrice) * i.quantity,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
