import { NextRequest } from 'next/server';
import { registerSchema } from '@/modules/auth/validation';
import { registerUser, AuthError } from '@/modules/auth/service';
import { getSessionCookieOptions } from '@/modules/auth/session';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
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

    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration parameters provided.',
        details,
        status: 400,
      });
    }

    const { user, token } = await registerUser(parseResult.data);
    const response = apiSuccess({ user }, 201);
    const cookieOptions = getSessionCookieOptions();

    response.cookies.set({
      name: cookieOptions.name,
      value: token,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    console.error('Unhandled registration error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred during registration.',
      status: 500,
    });
  }
}
