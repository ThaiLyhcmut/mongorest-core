/**
 * Cache Manager with multiple cache strategies
 */
import { ICache } from '../../shared/contracts';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  hits: number;
}

/**
 * In-memory cache implementation
 */
export class MemoryCache implements ICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private evictionStrategy: 'LRU' | 'LFU' | 'FIFO';

  constructor(maxSize: number = 1000, evictionStrategy: 'LRU' | 'LFU' | 'FIFO' = 'LRU') {
    this.maxSize = maxSize;
    this.evictionStrategy = evictionStrategy;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Update hits for LFU
    entry.hits++;
    
    // Update position for LRU
    if (this.evictionStrategy === 'LRU') {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }

    return entry.value;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + (ttl * 1000) : undefined,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  public async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  public async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    evictionStrategy: string;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      evictionStrategy: this.evictionStrategy
    };
  }

  private evict(): void {
    switch (this.evictionStrategy) {
      case 'LRU':
        // First entry is the least recently used
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
        break;
        
      case 'LFU':
        // Find entry with lowest hits
        let minHits = Infinity;
        let keyToEvict: string | null = null;
        
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        
        if (keyToEvict) this.cache.delete(keyToEvict);
        break;
        
      case 'FIFO':
        // Find oldest entry
        let oldestTime = Infinity;
        let oldestKey: string | null = null;
        
        for (const [key, entry] of this.cache.entries()) {
          if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = key;
          }
        }
        
        if (oldestKey) this.cache.delete(oldestKey);
        break;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Redis cache implementation
 */
export class RedisCache implements ICache {
  private client: any; // Redis client

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  public async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  public async clear(): Promise<void> {
    await this.client.flushdb();
  }

  public async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}

/**
 * Multi-tier cache implementation
 */
export class MultiTierCache implements ICache {
  private tiers: ICache[];

  constructor(tiers: ICache[]) {
    this.tiers = tiers;
  }

  public async get<T>(key: string): Promise<T | null> {
    for (let i = 0; i < this.tiers.length; i++) {
      const value = await this.tiers[i].get<T>(key);
      
      if (value !== null) {
        // Populate higher tiers
        for (let j = 0; j < i; j++) {
          await this.tiers[j].set(key, value);
        }
        return value;
      }
    }
    
    return null;
  }

  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in all tiers
    await Promise.all(
      this.tiers.map(tier => tier.set(key, value, ttl))
    );
  }

  public async delete(key: string): Promise<boolean> {
    const results = await Promise.all(
      this.tiers.map(tier => tier.delete(key))
    );
    return results.some(result => result);
  }

  public async clear(): Promise<void> {
    await Promise.all(
      this.tiers.map(tier => tier.clear())
    );
  }

  public async has(key: string): Promise<boolean> {
    for (const tier of this.tiers) {
      if (await tier.has(key)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Cache key generator
 */
export class CacheKeyGenerator {
  private namespace: string;

  constructor(namespace: string = 'mongorest') {
    this.namespace = namespace;
  }

  public generate(parts: string[]): string {
    return `${this.namespace}:${parts.join(':')}`;
  }

  public generateFromQuery(query: any): string {
    const hash = this.hash(JSON.stringify(query));
    return this.generate(['query', hash]);
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}