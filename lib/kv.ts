import { kv as vercelKv } from '@vercel/kv';

/**
 * Thin abstraction over Vercel KV so the rest of the app doesn't care whether
 * it's talking to real Redis or (only in local dev) an in-memory fallback.
 *
 * IMPORTANT: the in-memory fallback only exists so `npm run dev` doesn't crash
 * when KV_REST_API_URL / KV_REST_API_TOKEN aren't set yet. It is NOT persisted,
 * NOT shared across serverless function instances, and MUST NOT be relied on
 * in production. Always configure a real Vercel KV store before deploying.
 */

interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
  srem(key: string, member: string): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

class MemoryKv implements KvClient {
  private store = new Map<string, unknown>();
  private sets = new Map<string, Set<string>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.has(key) ? (this.store.get(key) as T) : null;
  }
  async set(key: string, value: unknown) {
    this.store.set(key, value);
    return 'OK';
  }
  async del(key: string) {
    this.store.delete(key);
    return 1;
  }
  async sadd(key: string, member: string) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member);
    return 1;
  }
  async srem(key: string, member: string) {
    this.sets.get(key)?.delete(member);
    return 1;
  }
  async smembers(key: string) {
    return Array.from(this.sets.get(key) ?? []);
  }
  async incr(key: string) {
    const current = ((this.store.get(key) as number) || 0) + 1;
    this.store.set(key, current);
    return current;
  }
  async expire(key: string, seconds: number) {
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.store.delete(key), seconds * 1000);
    // Don't keep the Node process alive just for this timer.
    (timer as unknown as { unref?: () => void }).unref?.();
    this.timers.set(key, timer);
    return 1;
  }
}

const hasRealKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

if (!hasRealKv) {
  // eslint-disable-next-line no-console
  console.warn(
    '[LinkShort] KV_REST_API_URL / KV_REST_API_TOKEN are not set. Falling back to an ' +
      'in-memory store for local development ONLY. Links will NOT persist across restarts ' +
      'and will NOT be shared across devices or serverless instances. Create a Vercel KV ' +
      'store and set these env vars before deploying.',
  );
}

export const kv: KvClient = hasRealKv ? (vercelKv as unknown as KvClient) : new MemoryKv();
export const isUsingRealKv = hasRealKv;
