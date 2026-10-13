import { NextRequest } from 'next/server';
import { verifyAndResetPassword } from '@/modules/auth/password-reset';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = ResetPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      return apiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid password reset submission.',
        details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), issue: e.message })),
        status: 422,
      });
    }

    const isSuccess = await verifyAndResetPassword(parsed.data.token, parsed.data.newPassword);

    if (!isSuccess) {
      return apiError({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset token is invalid, expired, or has already been used.',
        status: 400,
      });
    }

    return apiSuccess(
      {
        data: {
          message: 'Password has been successfully updated. You may now sign in with your new password.',
        },
      },
      200
    );
  } catch (error) {
    console.error('Unhandled reset-password error:', error);
    return apiError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to reset password.',
      status: 500,
    });
  }
}
