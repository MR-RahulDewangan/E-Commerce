import { NextRequest } from 'next/server';
import {
  addItemToCart,
  CartError,
  CART_SESSION_COOKIE_NAME,
  CART_DURATION_DAYS,
} from '@/modules/cart/service';
import { addToCartSchema } from '@/modules/cart/validation';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError({
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        status: 400,
      });
    }

    const { variantId, quantity } = addToCartSchema.parse(body);
    const sessionToken = req.cookies.get(CART_SESSION_COOKIE_NAME)?.value;
    const sessionUser = await getSessionUserFromRequest(req);

    const cart = await addItemToCart(variantId, quantity, sessionToken, sessionUser?.id);

    const res = apiSuccess({ data: { cart } }, 200);

    // Set or refresh cart_session cookie
    res.cookies.set({
      name: CART_SESSION_COOKIE_NAME,
      value: cart.sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CART_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid cart item payload.',
        details: error.errors.map((e) => ({ field: e.path.join('.'), issue: e.message })),
        status: 400,
      });
    }

    if (error instanceof CartError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Unhandled addItemToCart error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add item to cart.',
      status: 500,
    });
  }
}
