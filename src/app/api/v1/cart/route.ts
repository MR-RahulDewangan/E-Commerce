import { NextRequest } from 'next/server';
import {
  getCartDetails,
  clearCart,
  CART_SESSION_COOKIE_NAME,
  CART_DURATION_DAYS,
} from '@/modules/cart/service';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';

function getCartSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(CART_SESSION_COOKIE_NAME)?.value;
}

export async function GET(req: NextRequest) {
  try {
    const sessionToken = getCartSessionToken(req);
    const sessionUser = await getSessionUserFromRequest(req);
    const destinationState = req.nextUrl.searchParams.get('destinationState') || undefined;

    const cart = await getCartDetails(sessionToken, sessionUser?.id, destinationState);

    const res = apiSuccess({ data: { cart } }, 200);

    // Ensure cart_session cookie is set
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
    console.error('Unhandled getCart error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve shopping cart.',
      status: 500,
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionToken = getCartSessionToken(req);
    const sessionUser = await getSessionUserFromRequest(req);

    const cart = await clearCart(sessionToken, sessionUser?.id);

    return apiSuccess({ data: { cart } }, 200);
  } catch (error) {
    console.error('Unhandled clearCart error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to clear shopping cart.',
      status: 500,
    });
  }
}
