import { getSessionCookieOptions } from '@/modules/auth/session';
import { apiSuccess } from '@/lib/api-response';

export async function POST() {
  const response = apiSuccess({ message: 'Logged out successfully.' }, 200);
  const cookieOptions = getSessionCookieOptions();

  response.cookies.set({
    name: cookieOptions.name,
    value: '',
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    maxAge: 0,
    path: cookieOptions.path,
  });

  return response;
}
