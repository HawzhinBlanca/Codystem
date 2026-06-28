export interface CacheDeps<T> {
  load: () => Promise<T>;
  fingerprint: () => Promise<string>;
}

/**
 * Memoize an async value, reloading only when `fingerprint()` changes. Used by the MCP server
 * to avoid re-reading + re-parsing every ledger on every tool call, while staying correct:
 * the fingerprint is the ledger files' mtimes, so a real change invalidates the cache.
 */
export function createCache<T>({ load, fingerprint }: CacheDeps<T>): { get: () => Promise<T> } {
  let cached: T | undefined;
  let cachedFingerprint: string | undefined;
  let populated = false;
  return {
    async get(): Promise<T> {
      const fp = await fingerprint();
      if (populated && fp === cachedFingerprint) return cached as T;
      cached = await load();
      cachedFingerprint = fp;
      populated = true;
      return cached;
    },
  };
}
