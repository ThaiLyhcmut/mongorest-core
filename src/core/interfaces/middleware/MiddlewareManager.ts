/**
 * Middleware Manager for handling request/response pipeline
 */
import { IMiddleware } from '../../shared/contracts';

export interface IMiddlewareContext {
  request: any;
  response: any;
  metadata: Map<string, any>;
  error?: Error;
}

export class MiddlewareManager {
  private middlewares: IMiddleware<IMiddlewareContext>[] = [];

  /**
   * Register a middleware
   */
  public use(middleware: IMiddleware<IMiddlewareContext>): void {
    this.middlewares.push(middleware);
  }

  /**
   * Execute middleware pipeline
   */
  public async execute(context: IMiddlewareContext): Promise<void> {
    const execute = async (index: number): Promise<void> => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index];
      await middleware.execute(context, () => execute(index + 1));
    };

    await execute(0);
  }

  /**
   * Clear all middlewares
   */
  public clear(): void {
    this.middlewares = [];
  }

  /**
   * Get middleware count
   */
  public count(): number {
    return this.middlewares.length;
  }
}

/**
 * Base middleware class
 */
export abstract class BaseMiddleware implements IMiddleware<IMiddlewareContext> {
  public abstract execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void>;
}

/**
 * Logging middleware
 */
export class LoggingMiddleware extends BaseMiddleware {
  constructor(private logger: any) {
    super();
  }

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    context.metadata.set('requestId', requestId);
    
    this.logger.info('Request started', {
      requestId,
      request: context.request
    });

    try {
      await next();
      
      const duration = Date.now() - startTime;
      this.logger.info('Request completed', {
        requestId,
        duration,
        response: context.response
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Request failed', error, {
        requestId,
        duration
      });
      throw error;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Validation middleware
 */
export class ValidationMiddleware extends BaseMiddleware {
  constructor(private validator: any) {
    super();
  }

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    const validationResult = await this.validator.validate(context.request);
    
    if (!validationResult.isValid) {
      const error = new Error('Validation failed');
      (error as any).validationErrors = validationResult.errors;
      throw error;
    }

    await next();
  }
}

/**
 * Cache middleware
 */
export class CacheMiddleware extends BaseMiddleware {
  constructor(private cache: any) {
    super();
  }

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(context.request);
    
    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      context.response = cached;
      context.metadata.set('cacheHit', true);
      return;
    }

    // Execute request
    await next();

    // Cache response
    if (context.response && !context.error) {
      await this.cache.set(cacheKey, context.response, 300); // 5 minutes TTL
    }
  }

  private generateCacheKey(request: any): string {
    return `cache_${JSON.stringify(request)}`;
  }
}

/**
 * Rate limiting middleware
 */
export class RateLimitMiddleware extends BaseMiddleware {
  constructor(private rateLimiter: any) {
    super();
  }

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    const identifier = this.getIdentifier(context);
    const result = await this.rateLimiter.consume(identifier);

    if (!result.allowed) {
      const error = new Error('Rate limit exceeded');
      (error as any).retryAfter = result.msBeforeNext;
      throw error;
    }

    context.metadata.set('rateLimit', {
      remaining: result.remainingPoints,
      reset: Date.now() + result.msBeforeNext
    });

    await next();
  }

  private getIdentifier(context: IMiddlewareContext): string {
    // Extract identifier from context (e.g., user ID, IP address)
    return context.metadata.get('userId') || 'anonymous';
  }
}

/**
 * Error handling middleware
 */
export class ErrorHandlingMiddleware extends BaseMiddleware {
  constructor(private errorHandler: (error: Error) => any) {
    super();
  }

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    try {
      await next();
    } catch (error) {
      context.error = error as Error;
      context.response = this.errorHandler(error as Error);
    }
  }
}

/**
 * Performance monitoring middleware
 */
export class PerformanceMiddleware extends BaseMiddleware {
  private metrics: Map<string, number[]> = new Map();

  public async execute(
    context: IMiddlewareContext,
    next: () => Promise<void>
  ): Promise<void> {
    const operation = context.request.operation || 'unknown';
    const startTime = Date.now();

    await next();

    const duration = Date.now() - startTime;
    this.recordMetric(operation, duration);
    
    context.metadata.set('performance', {
      duration,
      operation
    });
  }

  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  public getMetrics(operation: string): { avg: number; min: number; max: number } | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sum = metrics.reduce((a, b) => a + b, 0);
    return {
      avg: sum / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics)
    };
  }
}