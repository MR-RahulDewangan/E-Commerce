import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { db } from '@/lib/db';
import { ShippingAddressInputSchema } from '@/modules/checkout/validation';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 });
    }

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }],
    });

    return apiSuccess({ data: { addresses } }, 200);
  } catch (error) {
    console.error('Unhandled getAddresses error:', error);
    return apiError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve addresses.', status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = ShippingAddressInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid address fields.',
        details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), issue: e.message })),
        status: 422,
      });
    }

    const existingCount = await db.address.count({ where: { userId: user.id } });
    const isDefault = existingCount === 0;

    const address = await db.address.create({
      data: {
        userId: user.id,
        recipientName: parsed.data.recipientName,
        phoneNumber: parsed.data.phoneNumber,
        streetLine1: parsed.data.streetLine1,
        streetLine2: parsed.data.streetLine2 || null,
        city: parsed.data.city,
        stateProvince: parsed.data.stateProvince,
        postalCode: parsed.data.postalCode,
        countryCode: 'IN',
        isDefault,
      },
    });

    return apiSuccess({ data: { address } }, 201);
  } catch (error) {
    console.error('Unhandled createAddress error:', error);
    return apiError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add address.', status: 500 });
  }
}
