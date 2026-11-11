// FlowHub Redis 캐시 헬퍼

import redis from "./redis";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const v = await redis.get(key);
    if (!v) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 30): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* ignore */
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}
