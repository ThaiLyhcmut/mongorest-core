import { 
  IntermediateQuery, 
  IntermediateQueryResult 
} from '../../types/intermediateQuery';
import { AdapterErrors } from '../../errors/errorFactories';

/**
 * Base interface for all database adapters
 */
export interface DatabaseAdapter {
  /** Adapter name/identifier */
  readonly name: string;
  
  /** Database type */
  readonly type: DatabaseType;
  
  /** Adapter version */
  readonly version: string;

  /**
   * Convert intermediate query to native database query
   */
  convertQuery(query: IntermediateQuery): any;

  /**
   * Execute the converted query
   */
  executeQuery<T = any>(nativeQuery: any, options?: ExecutionOptions): Promise<IntermediateQueryResult<T>>;

  /**
   * Validate if the intermediate query is supported
   */
  validateQuery(query: IntermediateQuery): ValidationResult;

  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities;

  /**
   * Initialize adapter with configuration
   */
  initialize(config: AdapterConfig): Promise<void>;

  /**
   * Cleanup adapter resources
   */
  dispose(): Promise<void>;

  // Enhanced methods for v2.0 (optional for backward compatibility)
  find?<T = any>(collection: string, query: any): Promise<T[]>;
  create?<T = any>(collection: string, data: any): Promise<T>;
  update?<T = any>(collection: string, filter: any, data: any): Promise<T>;
  delete?(collection: string, filter: any): Promise<{ deletedCount: number }>;
  
  // Transaction support (optional)
  beginTransaction?(): Promise<void>;
  commitTransaction?(): Promise<void>;
  rollbackTransaction?(): Promise<void>;
  supportsTransactions?(): Promise<boolean>;
  
  // Collection management (optional)
  listCollections?(): Promise<string[]>;
  createCollection?(name: string): Promise<void>;
  createIndex?(collection: string, spec: any, options?: any): Promise<void>;
  
  // Connection management (optional)
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected?(): boolean;

  /**
   * Test adapter connection (optional)
   */
  testConnection?(): Promise<boolean>;
}

export type DatabaseType = 
  | 'mongodb' | 'postgresql' | 'mysql' | 'elasticsearch' 
  | 'redis' | 'sqlite' | 'oracle' | 'custom' | 'mock';

export interface ExecutionOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to return raw results */
  raw?: boolean;
  
  /** Transaction context */
  transaction?: any;
  
  /** Additional driver-specific options */
  driverOptions?: Record<string, any>;
}

export interface ValidationResult {
  /** Whether the query is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Error code */
  code: string;
  
  /** Human-readable message */
  message: string;
  
  /** Path to the problematic part of query */
  path?: string;
  
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Human-readable message */
  message: string;
  
  /** Path to the concerning part of query */
  path?: string;
}

export interface AdapterCapabilities {
  /** Supported filter operators */
  filterOperators: string[];
  
  /** Supported join types */
  joinTypes: string[];
  
  /** Supported aggregation functions */
  aggregations: string[];
  
  /** Whether full-text search is supported */
  fullTextSearch: boolean;
  
  /** Whether transactions are supported */
  transactions: boolean;
  
  /** Whether nested queries are supported */
  nestedQueries: boolean;
  
  /** Maximum query complexity */
  maxComplexity?: number;
  
  /** Maximum result size */
  maxResultSize?: number;
  
  /** Custom capabilities */
  custom?: Record<string, any>;
}

export interface AdapterConfig {
  /** Connection configuration */
  connection: ConnectionConfig;
  
  /** Performance settings */
  performance?: PerformanceConfig;
  
  /** Security settings */
  security?: SecurityConfig;
  
  /** Adapter-specific settings */
  custom?: Record<string, any>;
}

export interface ConnectionConfig {
  /** Database host */
  host?: string;
  
  /** Database port */
  port?: number;
  
  /** Database name */
  database?: string;
  
  /** Username */
  username?: string;
  
  /** Password */
  password?: string;
  
  /** Connection string (alternative to individual params) */
  connectionString?: string;
  
  /** Connection pool settings */
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
    acquire?: number;
  };
  
  /** SSL configuration */
  ssl?: boolean | Record<string, any>;
}

export interface PerformanceConfig {
  /** Query timeout in milliseconds */
  queryTimeout?: number;
  
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  
  /** Enable query caching */
  enableCache?: boolean;
  
  /** Cache TTL in seconds */
  cacheTTL?: number;
  
  /** Enable query optimization */
  optimize?: boolean;
}

export interface SecurityConfig {
  /** Enable SQL injection protection */
  sqlInjectionProtection?: boolean;
  
  /** Maximum query depth */
  maxQueryDepth?: number;
  
  /** Enable audit logging */
  auditLog?: boolean;
  
  /** Allowed operations */
  allowedOperations?: string[];
}

/**
 * Abstract base class for database adapters
 */
export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  abstract readonly name: string;
  abstract readonly type: DatabaseType;
  abstract readonly version: string;

  protected config?: AdapterConfig;
  protected isInitialized = false;

  abstract convertQuery(query: IntermediateQuery): any;
  abstract executeQuery<T = any>(nativeQuery: any, options?: ExecutionOptions): Promise<IntermediateQueryResult<T>>;

  validateQuery(query: IntermediateQuery): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!query.collection) {
      errors.push({
        code: 'MISSING_COLLECTION',
        message: 'Collection/table name is required',
        path: 'collection'
      });
    }

    // Validate against capabilities
    const capabilities = this.getCapabilities();
    
    // Check filter operators
    if (query.filter) {
      this.validateFilterOperators(query.filter, capabilities, errors);
    }

    // Check join types
    if (query.joins) {
      query.joins.forEach((join, index) => {
        if (!capabilities.joinTypes.includes(join.type)) {
          errors.push({
            code: 'UNSUPPORTED_JOIN_TYPE',
            message: `Join type '${join.type}' is not supported`,
            path: `joins[${index}].type`
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected validateFilterOperators(filter: any, capabilities: AdapterCapabilities, errors: ValidationError[]): void {
    if (filter.conditions) {
      filter.conditions.forEach((condition: any, index: number) => {
        if (!capabilities.filterOperators.includes(condition.operator)) {
          errors.push({
            code: 'UNSUPPORTED_OPERATOR',
            message: `Filter operator '${condition.operator}' is not supported`,
            path: `filter.conditions[${index}].operator`
          });
        }
      });
    }

    if (filter.nested) {
      filter.nested.forEach((nested: any) => {
        this.validateFilterOperators(nested, capabilities, errors);
      });
    }
  }

  abstract getCapabilities(): AdapterCapabilities;

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  async dispose(): Promise<void> {
    this.isInitialized = false;
  }

  abstract testConnection(): Promise<boolean>;

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw AdapterErrors.notInitialized(this.name);
    }
  }

  protected createResult<T>(
    data: T[],
    query: IntermediateQuery,
    nativeQuery: any,
    executionTime?: number
  ): IntermediateQueryResult<T> {
    const result: IntermediateQueryResult<T> = {
      data,
      metadata: {
        adapter: this.name,
        query,
        nativeQuery,
        executionTime
      }
    };

    // Add pagination info if applicable
    if (query.pagination) {
      result.pagination = {
        offset: query.pagination.offset || 0,
        limit: query.pagination.limit || data.length,
        hasMore: query.pagination.limit ? data.length >= query.pagination.limit : false
      };
    }

    return result;
  }
}