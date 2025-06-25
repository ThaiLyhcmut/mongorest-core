// Main Core - Legacy
export { NewCore } from './core/main/newCore';
export { CoreBootstrap } from './core/bootstrap';

// New Improved Core
export { CoreService, CoreServiceConfig } from './core/application/services/CoreService';
export { QueryOptimizer } from './core/application/services/QueryOptimizer';
export { TransactionManager } from './core/application/services/TransactionManager';

// Domain Entities
export { Query } from './core/domain/entities/Query';

// Infrastructure
export { MemoryCache, RedisCache, MultiTierCache, CacheKeyGenerator } from './core/infrastructure/cache/CacheManager';
export { Logger, LogLevel, LoggerFactory, PerformanceLogger } from './core/infrastructure/logging/Logger';
export { ConnectionPool, ConnectionFactory, PoolOptions } from './core/infrastructure/persistence/ConnectionPool';

// Middleware
export { 
  MiddlewareManager,
  BaseMiddleware,
  LoggingMiddleware,
  ValidationMiddleware,
  CacheMiddleware,
  RateLimitMiddleware,
  ErrorHandlingMiddleware,
  PerformanceMiddleware,
  IMiddlewareContext
} from './core/interfaces/middleware/MiddlewareManager';

// Contracts
export * from './core/shared/contracts';

import { CoreBootstrap } from './core/bootstrap';
import { AdapterBridge } from './core/adapters/base/AdapterBridge';
import { CoreService } from './core/application/services/CoreService';

// Adapters
export { DatabaseAdapter } from './core/adapters/base/databaseAdapter';
export { AdapterRegistry } from './core/adapters/base/adapterRegistry';

// Database Adapters
export { MongoDBAdapter } from './core/adapters/mongodb/mongodbAdapter';
export { PostgreSQLAdapter } from './core/adapters/postgresql/postgresqlAdapter';
export { MySQLAdapter } from './core/adapters/mysql/mysqlAdapter';
export { ElasticsearchAdapter } from './core/adapters/elasticsearch/elasticsearchAdapter';

// Relationships
export { RelationshipRegistry } from './core/adapters/base/relationship/RelationshipRegistry';
export { Relationship } from './core/adapters/base/relationship/mainRelationship';
export { OneToOneRelationship } from './core/adapters/base/relationship/oneToOneRelationship';
export { OneToManyRelationship } from './core/adapters/base/relationship/oneToManyRelationship';
export { ManyToOneRelationship } from './core/adapters/base/relationship/manyToOneRelationship';
export { ManyToManyRelationship } from './core/adapters/base/relationship/manyToManyRelationship';
export { RelationshipDefinition, JoinCondition, JoinHint, JunctionConfig, EmbedRequest } from './core/adapters/base/relationship/types';

// Query Converter
export { QueryConverter } from './core/converter/queryConverter';


// RBAC
export { RbacValidator } from './core/rbac/rbac-validator';
export * from './core/rbac/rbac-interface';

// Errors
export { ErrorCodes } from './core/errors/errorCodes';
export * from './core/errors/errorFactories';

// Schema
export { SchemaValidator } from './core/schema/schema-validator';
export { DataValidator } from './core/schema/data-validator';
export * from './core/schema/types/validation';
export * from './core/schema/types/transformation';
export * from './core/schema/types/relationship';
export { loadSchema } from './core/schema/loader';

// Types
export * from './core/types/intermediateQuery';

// Configuration Types
import { DatabaseAdapter } from './core/adapters/base/databaseAdapter';

export interface MongorestConfig {
  adapters?: {
    [key: string]: DatabaseAdapter;
  };
  defaultAdapter?: string;
  rbac?: {
    enabled: boolean;
    defaultRoles?: string[];
  };
  schema?: {
    strictMode?: boolean;
    autoLoad?: boolean;
    directory?: string;
  };
  relationships?: {
    autoPopulate?: boolean;
    maxDepth?: number;
  };
  query?: {
    maxLimit?: number;
    defaultLimit?: number;
  };
  errors?: {
    includeStack?: boolean;
    logErrors?: boolean;
  };
}

// Re-export commonly used interfaces
export interface CoreOptions {
  adapter?: string;
  skipRbac?: boolean;
  skipValidation?: boolean;
  user?: any;
  context?: Record<string, any>;
}

export interface QueryOptions extends CoreOptions {
  populate?: string[];
  select?: string[];
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

// Bridge for legacy compatibility
export { AdapterBridge } from './core/adapters/base/AdapterBridge';

// Utility function for easy initialization (legacy)
export async function createMongorestCore(config?: MongorestConfig) {
  const bootstrap = new CoreBootstrap();
  if (config) {
    return bootstrap.initializeWithConfig(config as any);
  }
  return bootstrap.initializeWithBuiltinAdapters();
}

// New recommended factory function
export function createCoreService(config: {
  adapters: Array<{ name: string; adapter: any }>;
  defaultAdapter: string;
  cache?: any;
  logger?: any;
}): CoreService {
  const adaptersMap = new Map();
  
  for (const { name, adapter } of config.adapters) {
    // Wrap legacy adapters with bridge
    const bridgedAdapter = new AdapterBridge(adapter);
    adaptersMap.set(name, bridgedAdapter);
  }
  
  return new CoreService({
    adapters: adaptersMap,
    defaultAdapter: config.defaultAdapter,
    cache: config.cache,
    logger: config.logger
  });
}

// Advanced system factory for framework integration
export async function createCoreSystem(config: {
  adapters: Record<string, any>;
  defaultAdapter: string;
  features?: {
    caching?: any;
    rbac?: any;
    relationships?: boolean;
    validation?: boolean;
    logging?: any;
  };
  middleware?: any;
}): Promise<CoreService> {
  const { MongoDBAdapter } = await import('./core/adapters/mongodb/mongodbAdapter');
  const { PostgreSQLAdapter } = await import('./core/adapters/postgresql/postgresqlAdapter');
  const { MySQLAdapter } = await import('./core/adapters/mysql/mysqlAdapter');
  const { ElasticsearchAdapter } = await import('./core/adapters/elasticsearch/elasticsearchAdapter');
  
  const adaptersArray = [];
  let cacheInstance = null;
  
  // Create adapter instances based on configuration
  for (const [name, adapterConfig] of Object.entries(config.adapters)) {
    let adapter;
    
    switch (adapterConfig.type) {
      case 'mongodb':
        adapter = new MongoDBAdapter(adapterConfig);
        adaptersArray.push({ name, adapter });
        break;
      case 'postgresql':
        adapter = new PostgreSQLAdapter(adapterConfig);
        adaptersArray.push({ name, adapter });
        break;
      case 'mysql':
        adapter = new MySQLAdapter(adapterConfig);
        adaptersArray.push({ name, adapter });
        break;
      case 'elasticsearch':
        adapter = new ElasticsearchAdapter(adapterConfig);
        adaptersArray.push({ name, adapter });
        break;
      case 'redis':
        // Redis is used for caching, not as a database adapter
        if (config.features?.caching?.enabled) {
          const { RedisCache } = await import('./core/infrastructure/cache/CacheManager');
          cacheInstance = new RedisCache({
            host: adapterConfig.host,
            port: adapterConfig.port,
            password: adapterConfig.password,
            db: adapterConfig.db || 0
          });
        }
        break;
      default:
        console.warn(`Unsupported adapter type: ${adapterConfig.type}. Skipping...`);
    }
  }
  
  // Use cache from features config or Redis instance
  const cache = config.features?.caching?.enabled ? (cacheInstance || config.features.caching) : null;
  
  // Create core service
  const coreService = createCoreService({
    adapters: adaptersArray,
    defaultAdapter: config.defaultAdapter,
    cache: cache,
    logger: config.features?.logging
  });
  
  return coreService;
}