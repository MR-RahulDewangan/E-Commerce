import { NextRequest } from 'next/server';
import { sellerApplicationReviewSchema } from '@/modules/auth/validation';
import { reviewSellerApplication, getSellerApplications, AuthError } from '@/modules/auth/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';

async function verifyAdminAuth(): Promise<{ user: any; error?: Response }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    return { user: null, error: apiError({ code: 'UNAUTHORIZED', message: 'Authentication required.', status: 401 }) };
  }

  if (user.role !== 'ADMIN') {
    return { user: null, error: apiError({ code: 'FORBIDDEN', message: 'Admin access required.', status: 403 }) };
  }

  return { user };
}

// GET: List all seller applications (admin only)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getSellerApplications({ status: status || undefined, page, limit });

    return apiSuccess(result);
  } catch (error) {
    console.error('Get seller applications error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
      status: 500,
    });
  }
}

// POST: Review seller application (admin only)
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError({
        code: 'INVALID_JSON',
        message: 'Request body must be a valid JSON object.',
        status: 400,
      });
    }

    const parseResult = sellerApplicationReviewSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid review parameters provided.',
        details,
        status: 400,
      });
    }

    const result = await reviewSellerApplication(auth.user.id, parseResult.data);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Review seller application error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred during seller application review.',
      status: 500,
    });
  }
}