import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }
  return redis;
}

// Cache helpers
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await getRedis().get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Fail silently - cache is non-critical
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    const keys = await r.keys(pattern);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch {
    // Fail silently
  }
}

// Rate limiting
export async function checkRateLimit(key: string, ttlSeconds = 60): Promise<boolean> {
  try {
    const r = getRedis();
    const exists = await r.exists(key);
    if (exists) return false; // Rate limited
    await r.setex(key, ttlSeconds, '1');
    return true; // Allowed
  } catch {
    return true; // Allow on error
  }
}
