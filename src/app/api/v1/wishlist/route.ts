import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import {
  getUserWishlist,
  addItemToWishlist,
  WishlistError,
} from '@/modules/wishlist/service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const AddWishlistItemSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID format'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access your wishlist.',
        status: 401,
      });
    }

    const items = await getUserWishlist(user.id);
    return apiSuccess({ data: { items, count: items.length } }, 200);
  } catch (error) {
    console.error('Unhandled getWishlist error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve wishlist.',
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to add items to your wishlist.',
        status: 401,
      });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = AddWishlistItemSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body.',
        details: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          issue: e.message,
        })),
        status: 422,
      });
    }

    const item = await addItemToWishlist(user.id, parsed.data.variantId);
    return apiSuccess({ data: { item } }, 201);
  } catch (error) {
    if (error instanceof WishlistError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }
    console.error('Unhandled addWishlistItem error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add item to wishlist.',
      status: 500,
    });
  }
}
