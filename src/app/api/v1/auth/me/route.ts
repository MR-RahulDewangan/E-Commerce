import { NextRequest } from 'next/server';
import { getSessionUserFromRequest } from '@/modules/auth/session';
import { getUserById } from '@/modules/auth/service';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest(req);
    if (!sessionUser) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'Authentication session is required.',
        status: 401,
      });
    }

    const profile = await getUserById(sessionUser.id);
    if (!profile) {
      return apiError({
        code: 'USER_NOT_FOUND',
        message: 'User profile was not found.',
        status: 404,
      });
    }

    return apiSuccess({ user: profile }, 200);
  } catch (error) {
    console.error('Unhandled session lookup error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve authenticated session.',
      status: 500,
    });
  }
}
