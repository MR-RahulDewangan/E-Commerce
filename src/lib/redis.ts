import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | null;
};

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis_secure_password@localhost:6379';

/**
 * Returns a singleton Redis client instance with resilient error handling.
 */
export function getRedisClient(): Redis | null {
  if (globalForRedis.redisClient) {
    return globalForRedis.redisClient;
  }

  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      lazyConnect: false,
    });

    client.on('error', (err) => {
      // Log connection warning without crashing application
      console.warn('[Redis] Connection warning:', err.message);
    });

    globalForRedis.redisClient = client;
    return client;
  } catch (error) {
    console.warn('[Redis] Initialization error, falling back to database:', error);
    return null;
  }
}

export const redis = getRedisClient();
