/**
 * Rate limiting implementation
 */
import { IRateLimiter, IRateLimitResult } from '../../shared/contracts';

interface RateLimitEntry {
  points: number;
  resetAt: number;
}

/**
 * Memory-based rate limiter
 */
export class MemoryRateLimiter implements IRateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private options: {
      points: number;          // Number of points
      duration: number;        // Per duration in seconds
      blockDuration?: number;  // Block duration in seconds when consumed more than points
    }
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  public async consume(identifier: string, points: number = 1): Promise<IRateLimitResult> {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetAt <= now) {
      // Create new entry
      const resetAt = now + (this.options.duration * 1000);
      this.storage.set(identifier, {
        points: this.options.points - points,
        resetAt
      });

      return {
        allowed: true,
        remainingPoints: this.options.points - points,
        msBeforeNext: this.options.duration * 1000,
        consumedPoints: points
      };
    }

    // Check if blocked
    if (entry.points < 0 && this.options.blockDuration) {
      const blockResetAt = entry.resetAt + (this.options.blockDuration * 1000);
      
      if (now < blockResetAt) {
        return {
          allowed: false,
          remainingPoints: 0,
          msBeforeNext: blockResetAt - now,
          consumedPoints: 0
        };
      }
    }

    // Consume points
    entry.points -= points;
    const allowed = entry.points >= 0;

    return {
      allowed,
      remainingPoints: Math.max(0, entry.points),
      msBeforeNext: entry.resetAt - now,
      consumedPoints: allowed ? points : 0
    };
  }

  public async delete(identifier: string): Promise<void> {
    this.storage.delete(identifier);
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.storage.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [identifier, entry] of this.storage.entries()) {
      if (entry.resetAt <= now) {
        this.storage.delete(identifier);
      }
    }
  }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter implements IRateLimiter {
  private storage: Map<string, number[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private options: {
      points: number;
      duration: number; // in seconds
    }
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  public async consume(identifier: string, points: number = 1): Promise<IRateLimitResult> {
    const now = Date.now();
    const windowStart = now - (this.options.duration * 1000);
    
    // Get or create entry
    let timestamps = this.storage.get(identifier) || [];
    
    // Remove old timestamps outside window
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    // Check if can consume
    const currentPoints = timestamps.length;
    const allowed = currentPoints + points <= this.options.points;
    
    if (allowed) {
      // Add new timestamps
      for (let i = 0; i < points; i++) {
        timestamps.push(now);
      }
      this.storage.set(identifier, timestamps);
    }

    // Calculate ms before next
    let msBeforeNext = 0;
    if (!allowed && timestamps.length > 0) {
      const oldestInWindow = Math.min(...timestamps);
      msBeforeNext = (oldestInWindow + (this.options.duration * 1000)) - now;
    }

    return {
      allowed,
      remainingPoints: Math.max(0, this.options.points - timestamps.length),
      msBeforeNext,
      consumedPoints: allowed ? points : 0
    };
  }

  public async delete(identifier: string): Promise<void> {
    this.storage.delete(identifier);
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.storage.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - (this.options.duration * 1000);
    
    for (const [identifier, timestamps] of this.storage.entries()) {
      const filtered = timestamps.filter(ts => ts > windowStart);
      
      if (filtered.length === 0) {
        this.storage.delete(identifier);
      } else if (filtered.length !== timestamps.length) {
        this.storage.set(identifier, filtered);
      }
    }
  }
}

/**
 * Token bucket rate limiter
 */
export class TokenBucketRateLimiter implements IRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private options: {
      capacity: number;      // Maximum tokens in bucket
      refillRate: number;    // Tokens per second
      initialTokens?: number; // Initial tokens (default: capacity)
    }
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  public async consume(identifier: string, tokens: number = 1): Promise<IRateLimitResult> {
    let bucket = this.buckets.get(identifier);
    
    if (!bucket) {
      bucket = new TokenBucket(
        this.options.capacity,
        this.options.refillRate,
        this.options.initialTokens
      );
      this.buckets.set(identifier, bucket);
    }

    const result = bucket.consume(tokens);
    
    return {
      allowed: result.allowed,
      remainingPoints: Math.floor(result.remainingTokens),
      msBeforeNext: result.waitTime,
      consumedPoints: result.allowed ? tokens : 0
    };
  }

  public async delete(identifier: string): Promise<void> {
    this.buckets.delete(identifier);
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.buckets.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [identifier, bucket] of this.buckets.entries()) {
      if (now - bucket.lastAccess > maxAge) {
        this.buckets.delete(identifier);
      }
    }
  }
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  public lastAccess: number;

  constructor(
    private capacity: number,
    private refillRate: number,
    initialTokens?: number
  ) {
    this.tokens = initialTokens !== undefined ? initialTokens : capacity;
    this.lastRefill = Date.now();
    this.lastAccess = Date.now();
  }

  consume(count: number): { allowed: boolean; remainingTokens: number; waitTime: number } {
    this.refill();
    this.lastAccess = Date.now();

    if (this.tokens >= count) {
      this.tokens -= count;
      return {
        allowed: true,
        remainingTokens: this.tokens,
        waitTime: 0
      };
    }

    // Calculate wait time
    const tokensNeeded = count - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * 1000;

    return {
      allowed: false,
      remainingTokens: this.tokens,
      waitTime: Math.ceil(waitTime)
    };
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // in seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Composite rate limiter that combines multiple strategies
 */
export class CompositeRateLimiter implements IRateLimiter {
  constructor(private limiters: IRateLimiter[]) {}

  public async consume(identifier: string, points: number = 1): Promise<IRateLimitResult> {
    const results = await Promise.all(
      this.limiters.map(limiter => limiter.consume(identifier, points))
    );

    // All limiters must allow
    const allowed = results.every(r => r.allowed);
    const remainingPoints = Math.min(...results.map(r => r.remainingPoints));
    const msBeforeNext = Math.max(...results.map(r => r.msBeforeNext));
    
    return {
      allowed,
      remainingPoints,
      msBeforeNext,
      consumedPoints: allowed ? points : 0
    };
  }

  public async delete(identifier: string): Promise<void> {
    await Promise.all(
      this.limiters.map(limiter => limiter.delete(identifier))
    );
  }
}

/**
 * Rate limiter factory
 */
export class RateLimiterFactory {
  static createMemoryLimiter(options: {
    requests: number;
    perSeconds: number;
    blockDurationSeconds?: number;
  }): IRateLimiter {
    return new MemoryRateLimiter({
      points: options.requests,
      duration: options.perSeconds,
      blockDuration: options.blockDurationSeconds
    });
  }

  static createSlidingWindowLimiter(options: {
    requests: number;
    perSeconds: number;
  }): IRateLimiter {
    return new SlidingWindowRateLimiter({
      points: options.requests,
      duration: options.perSeconds
    });
  }

  static createTokenBucketLimiter(options: {
    capacity: number;
    refillPerSecond: number;
    initialTokens?: number;
  }): IRateLimiter {
    return new TokenBucketRateLimiter({
      capacity: options.capacity,
      refillRate: options.refillPerSecond,
      initialTokens: options.initialTokens
    });
  }

  static createCompositeLimiter(configs: Array<{
    type: 'memory' | 'sliding' | 'bucket';
    options: any;
  }>): IRateLimiter {
    const limiters = configs.map(config => {
      switch (config.type) {
        case 'memory':
          return this.createMemoryLimiter(config.options);
        case 'sliding':
          return this.createSlidingWindowLimiter(config.options);
        case 'bucket':
          return this.createTokenBucketLimiter(config.options);
        default:
          throw new Error(`Unknown limiter type: ${config.type}`);
      }
    });

    return new CompositeRateLimiter(limiters);
  }
}