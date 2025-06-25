/**
 * Improved Core Service with better architecture
 */
import { 
  IRepository, 
  IQuery, 
  IQueryResult,
  ICache,
  ILogger,
  IValidator,
  IQueryOptimizer,
  IMiddleware,
  IUnitOfWork,
  ITransaction
} from '../../shared/contracts';
import { Query } from '../../domain/entities/Query';
import { MiddlewareManager, IMiddlewareContext } from '../../interfaces/middleware/MiddlewareManager';
import { QueryOptimizer } from './QueryOptimizer';
import { TransactionManager, Transaction } from './TransactionManager';
import { DatabaseAdapter } from '../../adapters/base/databaseAdapter';
import { RbacValidator } from '../../rbac/rbac-validator';
import { QueryConverter } from '../../converter/queryConverter';
import { RelationshipRegistry } from '../../adapters/base/relationship/RelationshipRegistry';

export interface CoreServiceConfig {
  adapters: Map<string, DatabaseAdapter>;
  defaultAdapter: string;
  cache?: ICache;
  logger?: ILogger;
  validator?: IValidator;
  optimizer?: IQueryOptimizer;
  middlewares?: IMiddleware<IMiddlewareContext>[];
  rbac?: {
    enabled: boolean;
    validator?: RbacValidator;
  };
}

export class CoreService {
  private middlewareManager: MiddlewareManager;
  private queryOptimizer: IQueryOptimizer;
  private transactionManager: TransactionManager;
  private cache?: ICache;
  private logger?: ILogger;
  private validator?: IValidator;
  private rbacValidator?: RbacValidator;
  private queryConverter: QueryConverter;
  private relationshipRegistry: RelationshipRegistry;

  constructor(private config: CoreServiceConfig) {
    this.middlewareManager = new MiddlewareManager();
    this.queryOptimizer = config.optimizer || new QueryOptimizer();
    this.transactionManager = new TransactionManager(config.adapters);
    this.cache = config.cache;
    this.logger = config.logger;
    this.validator = config.validator;
    this.rbacValidator = config.rbac?.validator;
    this.queryConverter = new QueryConverter();
    this.relationshipRegistry = new RelationshipRegistry();

    // Register middlewares
    if (config.middlewares) {
      for (const middleware of config.middlewares) {
        this.middlewareManager.use(middleware);
      }
    }
  }

  /**
   * Execute a query with full pipeline
   */
  public async query<T>(query: IQuery, options?: QueryOptions): Promise<IQueryResult<T>> {
    const context: IMiddlewareContext = {
      request: { operation: 'query', query, options },
      response: null,
      metadata: new Map()
    };

    // Add user context if RBAC is enabled
    if (this.config.rbac?.enabled && options?.user) {
      context.metadata.set('user', options.user);
    }

    try {
      // Execute middleware pipeline
      await this.middlewareManager.execute(context);

      // If middleware handled the request, return response
      if (context.response) {
        return context.response;
      }

      // Execute the query
      const result = await this.executeQuery<T>(query, options);
      context.response = result;

      return result;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Query execution failed', error as Error, { query });
      }
      throw error;
    }
  }

  /**
   * Create a new record
   */
  public async create<T>(
    collection: string,
    data: Partial<T>,
    options?: MutationOptions
  ): Promise<T> {
    const context: IMiddlewareContext = {
      request: { operation: 'create', collection, data, options },
      response: null,
      metadata: new Map()
    };

    await this.middlewareManager.execute(context);

    if (context.response) {
      return context.response;
    }

    return this.executeCreate<T>(collection, data, options);
  }

  /**
   * Update a record
   */
  public async update<T>(
    collection: string,
    id: string | number,
    data: Partial<T>,
    options?: MutationOptions
  ): Promise<T> {
    const context: IMiddlewareContext = {
      request: { operation: 'update', collection, id, data, options },
      response: null,
      metadata: new Map()
    };

    await this.middlewareManager.execute(context);

    if (context.response) {
      return context.response;
    }

    return this.executeUpdate<T>(collection, id, data, options);
  }

  /**
   * Delete a record
   */
  public async delete(
    collection: string,
    id: string | number,
    options?: MutationOptions
  ): Promise<boolean> {
    const context: IMiddlewareContext = {
      request: { operation: 'delete', collection, id, options },
      response: null,
      metadata: new Map()
    };

    await this.middlewareManager.execute(context);

    if (context.response) {
      return context.response;
    }

    return this.executeDelete(collection, id, options);
  }

  /**
   * Execute in transaction
   */
  public async transaction<T>(
    operation: (transaction: ITransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const adapterName = options?.adapter || this.config.defaultAdapter;
    return this.transactionManager.executeInTransaction(adapterName, operation);
  }

  /**
   * Create a unit of work for complex operations
   */
  public createUnitOfWork(): IUnitOfWork {
    return this.transactionManager.createUnitOfWork();
  }

  /**
   * Add middleware
   */
  public use(middleware: IMiddleware<IMiddlewareContext>): void {
    this.middlewareManager.use(middleware);
  }

  /**
   * Get adapter
   */
  public getAdapter(name?: string): DatabaseAdapter {
    const adapterName = name || this.config.defaultAdapter;
    const adapter = this.config.adapters.get(adapterName);
    
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }
    
    return adapter;
  }

  private async executeQuery<T>(
    query: IQuery,
    options?: QueryOptions
  ): Promise<IQueryResult<T>> {
    // Validate query
    if (this.validator) {
      const validation = await this.validator.validate(query);
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors[0].message}`);
      }
    }

    // Apply RBAC
    if (this.config.rbac?.enabled && this.rbacValidator && options?.user) {
      const rbacQuery = await this.rbacValidator.applyRbac(query, options.user);
      query = rbacQuery;
    }

    // Optimize query
    const optimizedQuery = await this.queryOptimizer.optimize(query);

    // Check cache
    const cacheKey = new Query(optimizedQuery).hash();
    if (this.cache && options?.useCache !== false) {
      const cached = await this.cache.get<IQueryResult<T>>(cacheKey);
      if (cached) {
        if (this.logger) {
          this.logger.debug('Cache hit', { cacheKey });
        }
        return cached;
      }
    }

    // Get adapter and execute
    const adapter = this.getAdapter(options?.adapter);
    
    // Convert to legacy format if needed
    let convertedQuery: any;
    if (adapter.convertQuery) {
      convertedQuery = adapter.convertQuery(optimizedQuery as any);
    } else {
      convertedQuery = optimizedQuery;
    }
    
    const startTime = Date.now();
    let data: any[];
    
    if ('find' in adapter && adapter.find) {
      data = await (adapter.find as any)(optimizedQuery.collection, convertedQuery);
    } else {
      // Fallback to executeQuery for legacy adapters
      const result = await adapter.executeQuery(convertedQuery);
      data = result.data || [];
    }
    
    const duration = Date.now() - startTime;

    // Record performance
    (this.queryOptimizer as QueryOptimizer).recordPerformance(
      optimizedQuery,
      duration,
      data.length
    );

    // Apply relationships
    if (optimizedQuery.populate && optimizedQuery.populate.length > 0) {
      await this.populateRelationships(data, optimizedQuery.populate, adapter);
    }

    // Build result
    const result: IQueryResult<T> = {
      data: data as T[],
      total: data.length
    };

    // Add pagination info
    if (optimizedQuery.limit) {
      const queryEntity = new Query(optimizedQuery);
      result.page = queryEntity.getCurrentPage();
      result.pageSize = optimizedQuery.limit;
      
      if (result.total) {
        result.hasNext = result.page * result.pageSize < result.total;
        result.hasPrevious = result.page > 1;
      }
    }

    // Cache result
    if (this.cache && options?.useCache !== false) {
      await this.cache.set(cacheKey, result, options?.cacheTTL || 300);
    }

    return result;
  }

  private async executeCreate<T>(
    collection: string,
    data: Partial<T>,
    options?: MutationOptions
  ): Promise<T> {
    // Validate data
    if (this.validator) {
      const validation = await this.validator.validatePartial(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors[0].message}`);
      }
    }

    // Apply RBAC
    if (this.config.rbac?.enabled && this.rbacValidator && options?.user) {
      const canCreate = await this.rbacValidator.canCreate(collection, options.user);
      if (!canCreate) {
        throw new Error('Unauthorized: Cannot create in this collection');
      }
    }

    // Get adapter and execute
    const adapter = this.getAdapter(options?.adapter);
    
    if (options?.transaction) {
      // Execute in transaction context
      return new Promise((resolve, reject) => {
        (options.transaction as Transaction).addOperation(
          async () => {
            let result;
            if ('create' in adapter && adapter.create) {
              result = await (adapter.create as any)(collection, data);
            } else {
              // Fallback for legacy adapters
              const intermediateQuery = {
                collection,
                operation: 'create',
                data
              };
              const nativeQuery = adapter.convertQuery(intermediateQuery as any);
              const queryResult = await adapter.executeQuery(nativeQuery);
              result = queryResult.data;
            }
            resolve(result as T);
          },
          async () => {
            // Rollback logic if needed
          }
        );
      });
    }

    let result;
    if ('create' in adapter && adapter.create) {
      result = await (adapter.create as any)(collection, data);
    } else {
      // Fallback for legacy adapters
      const intermediateQuery = {
        collection,
        operation: 'create',
        data
      };
      const nativeQuery = adapter.convertQuery(intermediateQuery as any);
      const queryResult = await adapter.executeQuery(nativeQuery);
      result = queryResult.data;
    }

    // Invalidate cache
    if (this.cache) {
      await this.invalidateCache(collection);
    }

    return result as T;
  }

  private async executeUpdate<T>(
    collection: string,
    id: string | number,
    data: Partial<T>,
    options?: MutationOptions
  ): Promise<T> {
    // Validate data
    if (this.validator) {
      const validation = await this.validator.validatePartial(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors[0].message}`);
      }
    }

    // Apply RBAC
    if (this.config.rbac?.enabled && this.rbacValidator && options?.user) {
      const canUpdate = await this.rbacValidator.canUpdate(collection, id, options.user);
      if (!canUpdate) {
        throw new Error('Unauthorized: Cannot update this record');
      }
    }

    // Get adapter and execute
    const adapter = this.getAdapter(options?.adapter);
    
    let result;
    if ('update' in adapter && adapter.update) {
      result = await (adapter.update as any)(collection, { _id: id }, data);
    } else {
      // Fallback for legacy adapters
      const intermediateQuery = {
        collection,
        operation: 'update',
        filter: { _id: id },
        data
      };
      const nativeQuery = adapter.convertQuery(intermediateQuery as any);
      const queryResult = await adapter.executeQuery(nativeQuery);
      result = queryResult.data;
    }

    // Invalidate cache
    if (this.cache) {
      await this.invalidateCache(collection);
    }

    return result as T;
  }

  private async executeDelete(
    collection: string,
    id: string | number,
    options?: MutationOptions
  ): Promise<boolean> {
    // Apply RBAC
    if (this.config.rbac?.enabled && this.rbacValidator && options?.user) {
      const canDelete = await this.rbacValidator.canDelete(collection, id, options.user);
      if (!canDelete) {
        throw new Error('Unauthorized: Cannot delete this record');
      }
    }

    // Get adapter and execute
    const adapter = this.getAdapter(options?.adapter);
    
    let result;
    if ('delete' in adapter && adapter.delete) {
      result = await (adapter.delete as any)(collection, { _id: id });
    } else {
      // Fallback for legacy adapters
      const intermediateQuery = {
        collection,
        operation: 'delete',
        filter: { _id: id }
      };
      const nativeQuery = adapter.convertQuery(intermediateQuery as any);
      const queryResult = await adapter.executeQuery(nativeQuery);
      result = { deletedCount: (queryResult as any).deletedCount || 0 };
    }

    // Invalidate cache
    if (this.cache) {
      await this.invalidateCache(collection);
    }

    return result.deletedCount > 0;
  }

  private async populateRelationships(
    data: any[],
    populate: any[],
    adapter: DatabaseAdapter
  ): Promise<void> {
    // Implementation of relationship population
    // This is a simplified version - the full implementation would handle
    // nested populations, circular references, etc.
    for (const pop of populate) {
      // Try to find relationship by path
      let relationship = this.relationshipRegistry.get(pop.path);
      
      if (!relationship) {
        // Try with collection.path format
        for (const [key, rel] of (this.relationshipRegistry as any).relationships) {
          if (key.endsWith('.' + pop.path)) {
            relationship = rel;
            break;
          }
        }
      }
      
      if (relationship && 'populate' in relationship) {
        await (relationship as any).populate(data, adapter);
      }
    }
  }

  private async invalidateCache(collection: string): Promise<void> {
    if (!this.cache) return;
    
    // Simple invalidation strategy - in production, this would be more sophisticated
    await this.cache.clear();
  }
}

export interface QueryOptions {
  adapter?: string;
  user?: any;
  useCache?: boolean;
  cacheTTL?: number;
}

export interface MutationOptions {
  adapter?: string;
  user?: any;
  transaction?: ITransaction;
}

export interface TransactionOptions {
  adapter?: string;
  isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
}