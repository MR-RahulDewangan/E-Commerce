import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { removeItemFromWishlist } from '@/modules/wishlist/service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to modify your wishlist.',
        status: 401,
      });
    }

    const { id } = await params;
    const deleted = await removeItemFromWishlist(user.id, id);

    return apiSuccess({ data: { deleted: !!deleted } }, 200);
  } catch (error) {
    console.error('Unhandled removeWishlistItem error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to remove item from wishlist.',
      status: 500,
    });
  }
}
