// Main Core
export { NewCore } from './core/main/newCore';
export { CoreBootstrap } from './core/bootstrap';
import { CoreBootstrap } from './core/bootstrap';

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

// Utility function for easy initialization
export async function createMongorestCore(config?: MongorestConfig) {
  const bootstrap = new CoreBootstrap();
  if (config) {
    return bootstrap.initializeWithConfig(config as any);
  }
  return bootstrap.initializeWithBuiltinAdapters();
}