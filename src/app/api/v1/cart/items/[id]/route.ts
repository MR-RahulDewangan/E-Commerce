import { NextRequest } from 'next/server';
import {
  updateCartItemQuantity,
  removeCartItem,
  CartError,
  CART_SESSION_COOKIE_NAME,
} from '@/modules/cart/service';
import { updateCartItemSchema } from '@/modules/cart/validation';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await context.params;

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

    const { quantity } = updateCartItemSchema.parse(body);
    const sessionToken = req.cookies.get(CART_SESSION_COOKIE_NAME)?.value;
    const sessionUser = await getSessionUserFromRequest(req);

    const cart = await updateCartItemQuantity(itemId, quantity, sessionToken, sessionUser?.id);

    return apiSuccess({ data: { cart } }, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid quantity payload.',
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

    console.error('Unhandled updateCartItem error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update cart item.',
      status: 500,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await context.params;
    const sessionToken = req.cookies.get(CART_SESSION_COOKIE_NAME)?.value;
    const sessionUser = await getSessionUserFromRequest(req);

    const cart = await removeCartItem(itemId, sessionToken, sessionUser?.id);

    return apiSuccess({ data: { cart } }, 200);
  } catch (error) {
    console.error('Unhandled removeCartItem error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to remove cart item.',
      status: 500,
    });
  }
}
