import { 
  DatabaseAdapter, 
  DatabaseType, 
  AdapterCapabilities, 
  ValidationResult, 
  ExecutionOptions,
  AdapterConfig
} from '../../adapters/base/databaseAdapter';
import { IntermediateQuery, IntermediateQueryResult } from '../../types/intermediateQuery';

export class MockDatabaseAdapter implements DatabaseAdapter {
  readonly name: string;
  readonly type: DatabaseType;
  readonly version: string;

  private isInitialized = false;
  private currentIntermediateQuery?: IntermediateQuery;

  // Jest spies for testing
  public initialize = jest.fn();
  public dispose = jest.fn();
  public testConnection = jest.fn();

  constructor(
    name: string = 'mock-adapter',
    version: string = '1.0.0',
    type: DatabaseType = 'mock'
  ) {
    this.name = name;
    this.version = version;
    this.type = type;

    // Setup default mock implementations
    this.initialize = jest.fn().mockImplementation(async (config: AdapterConfig) => {
      this.isInitialized = true;
    });

    this.dispose = jest.fn().mockImplementation(async () => {
      this.isInitialized = false;
    });

    this.testConnection = jest.fn().mockResolvedValue(true);
  }

  convertQuery(query: IntermediateQuery): any {
    // Store the intermediate query for later use in executeQuery
    this.currentIntermediateQuery = query;
    
    // Mock conversion - return a simple representation
    const mockQuery = {
      collection: query.collection,
      filter: query.filter,
      select: query.select?.fields || ['*'],
      sort: query.sort,
      limit: query.pagination?.limit,
      skip: query.pagination?.offset
    };

    // For MongoDB-like operations
    if (this.type === 'mongodb' || this.type === 'mock') {
      return [
        { $match: mockQuery.filter || {} },
        ...(mockQuery.select.length > 0 ? [{ $project: this.createProjection(mockQuery.select) }] : []),
        ...(mockQuery.sort ? [{ $sort: this.createSort(mockQuery.sort) }] : []),
        ...(mockQuery.skip ? [{ $skip: mockQuery.skip }] : []),
        ...(mockQuery.limit ? [{ $limit: mockQuery.limit }] : [])
      ];
    }

    // For SQL-like operations
    if (this.type === 'postgresql' || this.type === 'mysql') {
      return {
        sql: 'SELECT * FROM ' + query.collection,
        params: []
      };
    }

    return mockQuery;
  }

  async executeQuery<T = any>(
    nativeQuery: any, 
    options?: ExecutionOptions
  ): Promise<IntermediateQueryResult<T>> {
    // Mock execution - return sample data
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
    ] as T[];

    const startTime = Date.now();
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const executionTime = Date.now() - startTime;

    return {
      data: mockData,
      metadata: {
        adapter: this.name,
        query: this.currentIntermediateQuery || {} as IntermediateQuery,
        nativeQuery,
        executionTime
      },
      pagination: {
        offset: 0,
        limit: mockData.length,
        hasMore: false
      }
    };
  }

  validateQuery(query: IntermediateQuery): ValidationResult {
    const errors = [];
    const warnings: any[] = [];

    // Basic validation
    if (!query.collection) {
      errors.push({
        code: 'MISSING_COLLECTION',
        message: 'Collection name is required',
        path: 'collection'
      });
    }

    // Mock some capability checks
    if (query.filter?.conditions) {
      query.filter.conditions.forEach((condition, index) => {
        if (!this.getCapabilities().filterOperators.includes(condition.operator)) {
          errors.push({
            code: 'UNSUPPORTED_OPERATOR',
            message: `Operator ${condition.operator} is not supported`,
            path: `filter.conditions[${index}].operator`
          });
        }
      });
    }

    // Mock join validation
    if (query.joins && query.joins.length > 0) {
      query.joins.forEach((join, index) => {
        if (!this.getCapabilities().joinTypes.includes(join.type)) {
          errors.push({
            code: 'UNSUPPORTED_JOIN',
            message: `Join type ${join.type} is not supported`,
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

  getCapabilities(): AdapterCapabilities {
    return {
      filterOperators: [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'nin', 'like', 'ilike', 'regex',
        'exists', 'null', 'notnull'
      ],
      joinTypes: [
        'inner', 'left', 'right', 'full',
        'lookup', 'embed', 'one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'
      ],
      aggregations: [
        'count', 'sum', 'avg', 'min', 'max', 'group'
      ],
      fullTextSearch: true,
      transactions: true,
      nestedQueries: true,
      maxComplexity: 100,
      maxResultSize: 10000,
      custom: {
        mockFeature: true
      }
    };
  }

  private createProjection(fields: string[]): Record<string, number> {
    if (fields.includes('*') || fields.length === 0) {
      return {};
    }

    const projection: Record<string, number> = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    return projection;
  }

  private createSort(sortClauses: any[]): Record<string, number> {
    const sort: Record<string, number> = {};
    sortClauses.forEach(clause => {
      sort[clause.field] = clause.direction === 'desc' ? -1 : 1;
    });
    return sort;
  }

  // Utility methods for testing
  public setInitialized(value: boolean): void {
    this.isInitialized = value;
  }

  public getInitialized(): boolean {
    return this.isInitialized;
  }

  // Mock specific behavior for different scenarios
  public mockValidationFailure(errors: any[]): void {
    (this.validateQuery as jest.Mock) = jest.fn().mockReturnValue({
      valid: false,
      errors,
      warnings: []
    });
  }

  public mockExecutionFailure(error: Error): void {
    (this.executeQuery as jest.Mock) = jest.fn().mockRejectedValue(error);
  }

  public mockConnectionFailure(): void {
    this.testConnection = jest.fn().mockResolvedValue(false);
  }

  public resetMocks(): void {
    jest.clearAllMocks();
    this.currentIntermediateQuery = undefined;
    
    // Reset to default implementations
    this.initialize = jest.fn().mockImplementation(async (config: AdapterConfig) => {
      this.isInitialized = true;
    });

    this.dispose = jest.fn().mockImplementation(async () => {
      this.isInitialized = false;
    });

    this.testConnection = jest.fn().mockResolvedValue(true);
  }
}