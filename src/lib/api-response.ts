import { NextResponse } from 'next/server';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorOptions {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  status?: number;
  requestId?: string;
}

/**
 * Standard RFC 7807 compliant API error response generator.
 */
export function apiError({
  code,
  message,
  details,
  status = 400,
  requestId,
}: ApiErrorOptions): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
        timestamp: new Date().toISOString(),
        requestId:
          requestId ||
          `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      },
    },
    { status }
  );
}

/**
 * Standard API success response generator.
 */
export function apiSuccess<T extends Record<string, any>>(
  data: T,
  status = 200,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status, headers }
  );
}
