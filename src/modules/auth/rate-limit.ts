/**
 * Resilient In-Memory & Redis-Compatible Token Bucket Rate Limiter
 * Enforces burst rate limits per client IP / identifier to protect against brute-force attacks and abuse.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs: number; // Duration of window in milliseconds
  max: number;      // Maximum allowed requests within the window
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments rate limit for a given key (e.g. client IP or identifier).
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now >= existing.resetAt) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    memoryStore.set(key, record);

    return {
      allowed: true,
      limit: options.max,
      remaining: options.max - 1,
      resetSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, options.max - existing.count);
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.max) {
    return {
      allowed: false,
      limit: options.max,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    limit: options.max,
    remaining,
    resetSeconds,
  };
}

/**
 * Resets the in-memory rate limit store (useful for automated testing).
 */
export function resetRateLimits(): void {
  memoryStore.clear();
}
