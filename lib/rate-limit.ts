import 'server-only';
import { kv } from '@/lib/kv';

/**
 * Fixed-window rate limiter backed by KV. Returns true if the action is
 * allowed, false if the caller has exceeded `limit` actions within
 * `windowSeconds`.
 */
export async function checkRateLimit(
  identifier: string,
  limit = 30,
  windowSeconds = 60 * 60,
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, windowSeconds);
  }
  return count <= limit;
}
