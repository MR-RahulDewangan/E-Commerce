import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access orders.',
        status: 401,
      });
    }

    const orders = await db.order.findMany({
      where: {
        OR: [
          { userId: user.id },
          { customerEmail: user.email },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ data: { orders, count: orders.length } }, 200);
  } catch (error) {
    console.error('Unhandled getOrders error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve orders.',
      status: 500,
    });
  }
}
