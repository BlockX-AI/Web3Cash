import { Redis } from 'ioredis';

const url = process.env.REDIS_URL;
if (!url) throw new Error('REDIS_URL env var not set');

/** Shared connection. BullMQ requires `maxRetriesPerRequest: null`. */
export const redisConnection = new Redis(url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
