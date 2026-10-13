import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { checkRateLimit } from '@/modules/auth/rate-limit';

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // 1. Rate Limiting for Auth and Checkout Endpoints
  const isAuthApi = pathname.startsWith('/api/v1/auth');
  const isCheckoutApi = pathname.startsWith('/api/v1/checkout');

  if (isAuthApi || isCheckoutApi) {
    const limitOptions = isAuthApi
      ? { windowMs: 60 * 1000, max: 5 } // 5 req/min
      : { windowMs: 60 * 1000, max: 10 }; // 10 req/min

    const rateKey = `${isAuthApi ? 'auth' : 'checkout'}:${ip}`;
    const rateCheck = checkRateLimit(rateKey, limitOptions);

    if (!rateCheck.allowed) {
      const rateResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again after a brief cooldown.',
            retryAfterSeconds: rateCheck.resetSeconds,
          },
        },
        { status: 429 }
      );
      rateResponse.headers.set('Retry-After', String(rateCheck.resetSeconds));
      rateResponse.headers.set('X-RateLimit-Limit', String(rateCheck.limit));
      rateResponse.headers.set('X-RateLimit-Remaining', '0');
      rateResponse.headers.set('X-RateLimit-Reset', String(rateCheck.resetSeconds));
      return applySecurityHeaders(rateResponse);
    }
  }

  // 2. Protected Routes (Account, Admin & Seller)
  const isAccountRoute = pathname.startsWith('/account');
  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/v1/admin');
  const isSellerRoute =
    pathname.startsWith('/seller') ||
    pathname.startsWith('/api/seller') ||
    pathname.startsWith('/api/v1/seller');

  if (!isAccountRoute && !isAdminRoute && !isSellerRoute) {
    const res = NextResponse.next();
    return applySecurityHeaders(res);
  }

  // Extract session token from cookie or Authorization header
  let token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  const user = token ? await verifySessionToken(token) : null;

  // Account Routes: Must be authenticated
  if (isAccountRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  // Admin Routes: Must be authenticated AND have ADMIN or FULFILLMENT role
  if (isAdminRoute) {
    const isApi = pathname.startsWith('/api');

    if (!user) {
      if (isApi) {
        const unauthRes = NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication session required.',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 401 }
        );
        return applySecurityHeaders(unauthRes);
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (user.role !== 'ADMIN' && user.role !== 'FULFILLMENT') {
      if (isApi) {
        const forbiddenRes = NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Administrator or fulfillment privileges required.',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 }
        );
        return applySecurityHeaders(forbiddenRes);
      }
      const forbiddenPage = new NextResponse(
        'Forbidden: Administrator or fulfillment privileges required.',
        { status: 403 }
      );
      return applySecurityHeaders(forbiddenPage);
    }
  }

  // Seller Routes: Must be authenticated AND have SELLER or ADMIN role
  if (isSellerRoute) {
    const isApi = pathname.startsWith('/api');

    if (!user) {
      if (isApi) {
        const unauthRes = NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication session required.',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 401 }
        );
        return applySecurityHeaders(unauthRes);
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      if (isApi) {
        const forbiddenRes = NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Seller or administrator privileges required.',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 }
        );
        return applySecurityHeaders(forbiddenRes);
      }
      const forbiddenPage = new NextResponse(
        'Forbidden: Seller or administrator privileges required.',
        { status: 403 }
      );
      return applySecurityHeaders(forbiddenPage);
    }
  }

  // Forward user context in headers to downstream handlers
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-email', user.email);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/account/:path*',
    '/admin/:path*',
    '/seller/:path*',
    '/api/:path*',
  ],
};
