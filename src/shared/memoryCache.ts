type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): T {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    return value;
  }

  async remember<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const active = this.inflight.get(key);
    if (active) {
      return active as Promise<T>;
    }

    const promise = resolver()
      .then((value) => this.set(key, value, ttlSeconds))
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  clear(key?: string) {
    if (key) {
      this.store.delete(key);
      this.inflight.delete(key);
      return;
    }

    this.store.clear();
    this.inflight.clear();
  }
}

export const memoryCache = new MemoryCache();
