import { Redis } from 'ioredis';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL env var not set');
  _redis = new Redis(url, { maxRetriesPerRequest: 3, enableReadyCheck: false, lazyConnect: true });
  return _redis;
}

/**
 * Velocity check: returns true if the user is UNDER the limit and increments
 * their counter, false if they are at or over the limit.
 */
export async function checkVelocity(
  walletAddress: string,
  limitPerHour: number,
): Promise<boolean> {
  const redis = getRedis();
  const key = `vel:${walletAddress.toLowerCase()}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 3600);
  }
  return current <= limitPerHour;
}
