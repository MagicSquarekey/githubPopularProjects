/**
 * Tiny in-memory TTL cache.
 *
 * GitHub's search API allows only 10 requests/min unauthenticated, so we cache
 * responses per key. Entries expire after `ttlMs`; stale entries are dropped on
 * read. Adequate for a single-instance deployment; a shared cache (Redis) would
 * be the next step for multi-instance setups.
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
