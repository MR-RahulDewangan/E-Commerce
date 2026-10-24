import { NextRequest } from 'next/server';
import { sellerApplicationSchema } from '@/modules/auth/validation';
import { submitSellerApplication, AuthError, getSellerApplication } from '@/modules/auth/service';
import { apiError, apiSuccess } from '@/lib/api-response';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        status: 401,
      });
    }

    // Only customers can apply
    if (user.role !== 'CUSTOMER') {
      return apiError({
        code: 'INVALID_ROLE',
        message: 'Only customers can apply to become sellers.',
        status: 400,
      });
    }

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

    const parseResult = sellerApplicationSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid seller application parameters provided.',
        details,
        status: 400,
      });
    }

    // Check if application already exists
    const existingApplication = await getSellerApplication(user.id);
    if (existingApplication) {
      return apiError({
        code: 'APPLICATION_EXISTS',
        message: 'Seller application already submitted.',
        status: 400,
      });
    }

    const application = await submitSellerApplication(user.id, parseResult.data);

    return apiSuccess({
      application,
      message: 'Seller application submitted successfully. Our team will review your application within 2-3 business days.',
    }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Unhandled seller application error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred during seller application.',
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return apiError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        status: 401,
      });
    }

    const application = await getSellerApplication(user.id);

    return apiSuccess({
      application,
    });
  } catch (error) {
    console.error('Get seller application error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
      status: 500,
    });
  }
}