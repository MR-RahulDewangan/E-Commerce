import { NextRequest } from 'next/server';
import { verifyEmailSchema } from '@/modules/auth/validation';
import { verifyEmailToken, markEmailVerified } from '@/modules/auth/email-verification';
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

    const parseResult = verifyEmailSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid verification token.',
        status: 400,
      });
    }

    const { token } = parseResult.data;

    const verified = await verifyEmailToken(token);
    if (!verified) {
      return apiError({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Invalid or expired verification token. Please request a new verification email.',
        status: 400,
      });
    }

    const marked = await markEmailVerified(verified.userId);
    if (!marked) {
      return apiError({
        code: 'VERIFICATION_FAILED',
        message: 'Failed to verify email. Please try again.',
        status: 500,
      });
    }

    return apiSuccess({
      message: 'Email verified successfully. You can now sign in to your account.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during email verification.',
      status: 500,
    });
  }
}