import { NextRequest } from 'next/server';
import { CreateCheckoutOrderSchema } from '@/modules/checkout/validation';
import { createCheckoutOrder, CheckoutError } from '@/modules/checkout/service';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { CART_SESSION_COOKIE_NAME } from '@/modules/cart/service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return apiError({
        code: 'INVALID_JSON_BODY',
        message: 'Request body must be a valid JSON object.',
        status: 400,
      });
    }

    const validation = CreateCheckoutOrderSchema.safeParse(rawBody);
    if (!validation.success) {
      const details = validation.error.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid checkout order submission.',
        details,
        status: 422,
      });
    }

    const sessionUser = await getSessionUserFromRequest(req);
    const cookieCartSessionToken = req.cookies.get(CART_SESSION_COOKIE_NAME)?.value;

    const result = await createCheckoutOrder(validation.data, {
      sessionUserId: sessionUser?.id,
      cookieCartSessionToken,
    });

    return apiSuccess({ data: result }, 201);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Unhandled checkout order creation error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process checkout order.',
      status: 500,
    });
  }
}
