/**
 * Advanced connection pool management
 */
import { IConnectionPool, IHealthCheck, IHealthStatus } from '../../shared/contracts';
import { EventEmitter } from 'events';

export interface PoolOptions {
  min: number;
  max: number;
  acquireTimeout?: number;
  createTimeout?: number;
  destroyTimeout?: number;
  idleTimeout?: number;
  reapInterval?: number;
  createRetry?: number;
  propagateCreateError?: boolean;
}

export interface ConnectionFactory<T> {
  create(): Promise<T>;
  destroy(connection: T): Promise<void>;
  validate(connection: T): Promise<boolean>;
}

interface PooledConnection<T> {
  connection: T;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

/**
 * Generic connection pool implementation
 */
export class ConnectionPool<T> implements IConnectionPool<T>, IHealthCheck {
  private availableConnections: PooledConnection<T>[] = [];
  private inUse: Map<T, PooledConnection<T>> = new Map();
  private pendingAcquires: Array<{
    resolve: (connection: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private isClosing = false;
  private reapIntervalId?: NodeJS.Timeout;
  private eventEmitter = new EventEmitter();
  
  constructor(
    private factory: ConnectionFactory<T>,
    private options: PoolOptions
  ) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Create minimum connections
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.options.min; i++) {
      promises.push(this.createConnection());
    }
    
    await Promise.all(promises);
    
    // Start reaper if configured
    if (this.options.reapInterval) {
      this.reapIntervalId = setInterval(
        () => this.reap(),
        this.options.reapInterval
      );
    }
  }

  public async acquire(): Promise<T> {
    if (this.isClosing) {
      throw new Error('Pool is closing');
    }

    // Try to get available connection
    const pooled = this.getAvailableConnection();
    if (pooled) {
      return pooled.connection;
    }

    // Check if we can create new connection
    if (this.size() < this.options.max) {
      try {
        await this.createConnection();
        const newPooled = this.getAvailableConnection();
        if (newPooled) {
          return newPooled.connection;
        }
      } catch (error) {
        this.eventEmitter.emit('createError', error);
        if (this.options.propagateCreateError) {
          throw error;
        }
      }
    }

    // Wait for connection to become available
    return this.waitForConnection();
  }

  public async release(connection: T): Promise<void> {
    const pooled = this.inUse.get(connection);
    
    if (!pooled) {
      throw new Error('Connection not found in pool');
    }

    this.inUse.delete(connection);
    pooled.lastUsedAt = Date.now();

    // Validate connection before returning to pool
    try {
      const isValid = await this.factory.validate(connection);
      if (!isValid) {
        await this.destroyConnection(pooled);
        await this.createConnection();
        return;
      }
    } catch (error) {
      await this.destroyConnection(pooled);
      await this.createConnection();
      return;
    }

    // Return to available pool
    this.availableConnections.push(pooled);
    
    // Notify waiting acquires
    this.notifyWaitingAcquires();
    
    this.eventEmitter.emit('release', connection);
  }

  public async drain(): Promise<void> {
    this.isClosing = true;

    // Clear reaper interval
    if (this.reapIntervalId) {
      clearInterval(this.reapIntervalId);
    }

    // Reject all pending acquires
    for (const pending of this.pendingAcquires) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Pool is draining'));
    }
    this.pendingAcquires = [];

    // Wait for all in-use connections to be released
    while (this.inUse.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Destroy all connections
    const destroyPromises: Promise<void>[] = [];
    for (const pooled of this.availableConnections) {
      destroyPromises.push(this.destroyConnection(pooled));
    }
    
    await Promise.all(destroyPromises);
    
    this.availableConnections = [];
    this.eventEmitter.emit('drain');
  }

  public size(): number {
    return this.availableConnections.length + this.inUse.size;
  }

  public available(): number {
    return this.availableConnections.length;
  }

  public pending(): number {
    return this.pendingAcquires.length;
  }

  public async check(): Promise<IHealthStatus> {
    try {
      const connection = await this.acquire();
      const isValid = await this.factory.validate(connection);
      await this.release(connection);

      if (isValid) {
        return {
          status: 'healthy',
          details: {
            size: this.size(),
            available: this.available(),
            inUse: this.inUse.size,
            pending: this.pending()
          }
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Connection validation failed'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: (error as Error).message
      };
    }
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    size: number;
    available: number;
    inUse: number;
    pending: number;
    totalCreated: number;
    totalDestroyed: number;
  } {
    let totalCreated = 0;
    let totalDestroyed = 0;

    return {
      size: this.size(),
      available: this.available(),
      inUse: this.inUse.size,
      pending: this.pending(),
      totalCreated,
      totalDestroyed
    };
  }

  private async createConnection(): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let i = 0; i <= (this.options.createRetry || 0); i++) {
      try {
        const connection = await this.factory.create();
        const pooled: PooledConnection<T> = {
          connection,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          useCount: 0
        };
        
        this.availableConnections.push(pooled);
        this.eventEmitter.emit('create', connection);
        
        return;
      } catch (error) {
        lastError = error as Error;
        if (i < (this.options.createRetry || 0)) {
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to create connection');
  }

  private async destroyConnection(pooled: PooledConnection<T>): Promise<void> {
    try {
      await this.factory.destroy(pooled.connection);
      this.eventEmitter.emit('destroy', pooled.connection);
    } catch (error) {
      this.eventEmitter.emit('destroyError', error);
    }
  }

  private getAvailableConnection(): PooledConnection<T> | null {
    if (this.availableConnections.length === 0) {
      return null;
    }

    const pooled = this.availableConnections.shift()!;
    pooled.useCount++;
    this.inUse.set(pooled.connection, pooled);
    
    return pooled;
  }

  private async waitForConnection(): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(p => p.timeout === timeout);
        if (index !== -1) {
          this.pendingAcquires.splice(index, 1);
        }
        reject(new Error('Acquire timeout'));
      }, this.options.acquireTimeout || 30000);

      this.pendingAcquires.push({ resolve, reject, timeout });
    });
  }

  private notifyWaitingAcquires(): void {
    while (this.pendingAcquires.length > 0 && this.availableConnections.length > 0) {
      const pending = this.pendingAcquires.shift()!;
      clearTimeout(pending.timeout);
      
      const pooled = this.getAvailableConnection();
      if (pooled) {
        pending.resolve(pooled.connection);
      }
    }
  }

  private async reap(): Promise<void> {
    const now = Date.now();
    const idleTimeout = this.options.idleTimeout || 300000; // 5 minutes
    
    const toDestroy: PooledConnection<T>[] = [];
    
    // Find idle connections
    for (let i = this.availableConnections.length - 1; i >= 0; i--) {
      const pooled = this.availableConnections[i];
      
      if (now - pooled.lastUsedAt > idleTimeout && this.size() > this.options.min) {
        this.availableConnections.splice(i, 1);
        toDestroy.push(pooled);
      }
    }

    // Destroy idle connections
    for (const pooled of toDestroy) {
      await this.destroyConnection(pooled);
    }
    
    if (toDestroy.length > 0) {
      this.eventEmitter.emit('reap', toDestroy.length);
    }
  }

  /**
   * Event handling
   */
  public on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  public off(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.off(event, handler);
  }
}