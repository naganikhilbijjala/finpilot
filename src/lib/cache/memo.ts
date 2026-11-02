// In-memory cache that also shares work in flight: when several parts of a
// page ask for the same thing at once, they wait on one request instead of
// each firing their own (which is what tripped SnapTrade's rate limit).

export interface Memo<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}

/**
 * `ttlMs` may depend on the value, e.g. keep a partial result only briefly.
 * Rejected loads are never cached, so the next caller retries.
 */
export function memo<T>(ttlMs: number | ((value: T) => number)): Memo<T> {
  const store = new Map<string, { promise: Promise<T>; expiresAt: number }>();

  return {
    get(key, load) {
      const hit = store.get(key);
      if (hit && Date.now() < hit.expiresAt) return hit.promise;

      const entry = { promise: load(), expiresAt: Infinity };
      store.set(key, entry);
      entry.promise.then(
        (value) => {
          entry.expiresAt = Date.now() + (typeof ttlMs === "function" ? ttlMs(value) : ttlMs);
        },
        () => {
          if (store.get(key) === entry) store.delete(key);
        }
      );
      return entry.promise;
    },
    clear() {
      store.clear();
    },
  };
}
