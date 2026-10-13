import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { resetRateLimits } from '@/modules/auth/rate-limit';

describe('Security Hardening & Rate Limiting Integration Tests', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows up to 5 auth requests then throttles with HTTP 429 Too Many Requests', async () => {
    const burstCount = 15;
    const results: number[] = [];

    for (let i = 0; i < burstCount; i++) {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        headers: {
          'x-forwarded-for': '203.0.113.42',
        },
      });
      const res = await middleware(req);
      results.push(res.status);
    }

    // Exactly first 5 requests should pass the rate limiter (status 200 from middleware passing through)
    const allowed = results.slice(0, 5);
    const throttled = results.slice(5);

    expect(allowed.every((s) => s === 200)).toBe(true);
    expect(throttled.length).toBe(10);
    expect(throttled.every((s) => s === 429)).toBe(true);
  });

  it('attaches Retry-After and rate limit telemetry headers upon 429 response', async () => {
    // Consume 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        headers: { 'x-forwarded-for': '198.51.100.12' },
      });
      await middleware(req);
    }

    // 6th request triggers 429
    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      headers: { 'x-forwarded-for': '198.51.100.12' },
    });
    const res = await middleware(req);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('allows 10 checkout requests before throttling at the 11th attempt', async () => {
    const testIp = '192.0.2.99';

    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
        headers: { 'x-forwarded-for': testIp },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
    }

    const throttledReq = new NextRequest('http://localhost:3000/api/v1/checkout/create-order', {
      headers: { 'x-forwarded-for': testIp },
    });
    const throttledRes = await middleware(throttledReq);
    expect(throttledRes.status).toBe(429);
  });

  it('enforces production security headers across responses', async () => {
    const req = new NextRequest('http://localhost:3000/products');
    const res = await middleware(req);

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
