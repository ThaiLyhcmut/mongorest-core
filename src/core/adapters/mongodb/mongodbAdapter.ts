import { 
  BaseDatabaseAdapter, 
  DatabaseType, 
  AdapterCapabilities, 
  ExecutionOptions,
  AdapterConfig
} from '../base/databaseAdapter';
import { 
  IntermediateQuery, 
  IntermediateQueryResult,
  FilterCondition,
  FieldCondition,
  JoinClause,
  SortClause
} from '../../types/intermediateQuery';
import { RelationshipRegistry } from '../base/relationship/RelationshipRegistry';
import { ObjectId } from 'mongodb';

/**
 * MongoDB adapter for converting intermediate queries to MongoDB aggregation pipelines
 */
export class MongoDBAdapter extends BaseDatabaseAdapter {
  readonly name = 'mongodb';
  readonly type: DatabaseType = 'mongodb';
  readonly version = '1.0.0';

  private relationshipRegistry?: RelationshipRegistry;
  private db?: any; // MongoDB database instance

  constructor(config?: any) {
    super();
    if (config instanceof RelationshipRegistry) {
      this.relationshipRegistry = config;
    } else if (config?.relationshipRegistry) {
      this.relationshipRegistry = config.relationshipRegistry;
    }
  }

  /**
   * Convert intermediate query to MongoDB query
   */
  convertQuery(query: IntermediateQuery): any {
    // Handle different query types
    switch (query.type) {
      case 'insert':
        return this.convertInsertQuery(query);
      case 'update':
        return this.convertUpdateQuery(query);
      case 'delete':
        return this.convertDeleteQuery(query);
      case 'read':
      default:
        return this.convertReadQuery(query);
    }
  }

  /**
   * Convert read query to MongoDB aggregation pipeline
   */
  private convertReadQuery(query: IntermediateQuery): any[] {
    const pipeline: any[] = [];

    // 1. Add lookup stages for joins first
    if (query.joins && query.joins.length > 0) {
      const lookupStages = this.convertJoins(query.joins, query.collection);
      pipeline.push(...lookupStages);
    }

    // 2. Add match stage for filters
    if (query.filter) {
      const matchStage = this.convertFilter(query.filter);
      console.log("matchStage", matchStage)
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }
    } else if (query.filters && query.filters.length > 0) {
      const matchStage = this.convertSimpleFilters(query.filters);
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }
    }

    // 3. Add projection stage
    // if (query.select && query.select.fields && query.select.fields.length > 0) {
    //   const projection = this.convertProjection(query.select);
    //   if (Object.keys(projection).length > 0) {
    //     pipeline.push({ $project: projection });
    //   }
    // }

    // 4. Add sort stage
    if (query.sort && query.sort.length > 0) {
      const sortStage = this.convertSort(query.sort);
      pipeline.push({ $sort: sortStage });
    }

    // 5. Add pagination stages
    if (query.pagination) {
      if (query.pagination.offset && query.pagination.offset > 0) {
        pipeline.push({ $skip: query.pagination.offset });
      }
      if (query.pagination.limit && query.pagination.limit > 0) {
        pipeline.push({ $limit: query.pagination.limit });
      }
    } else {
      if (query.skip && query.skip > 0) {
        pipeline.push({ $skip: query.skip });
      }
      if (query.limit && query.limit > 0) {
        pipeline.push({ $limit: query.limit });
      }
    }

    return pipeline;
  }

  /**
   * Convert insert query
   */
  private convertInsertQuery(query: IntermediateQuery): any {
    return {
      operation: 'insertOne',
      document: query.data
    };
  }

  /**
   * Convert update query
   */
  private convertUpdateQuery(query: IntermediateQuery): any {
    const filter = query.filters ? this.convertSimpleFilters(query.filters) : {};
    
    return {
      operation: query.options?.partial ? 'updateOne' : 'replaceOne',
      filter,
      update: query.options?.partial ? { $set: query.data } : query.data
    };
  }

  /**
   * Convert delete query
   */
  private convertDeleteQuery(query: IntermediateQuery): any {
    const filter = query.filters ? this.convertSimpleFilters(query.filters) : {};
    
    return {
      operation: 'deleteOne',
      filter
    };
  }

  /**
   * Convert simple filters array to MongoDB filter
   */
  private convertSimpleFilters(filters: Array<{field: string; operator: string; value: any}>): any {
    const mongoFilter: any = {};
    
    filters.forEach(filter => {
      const { field, operator, value } = filter;
      
      // Convert string to ObjectId for _id field
      let processedValue = value;
      if (field === '_id' && typeof value === 'string') {
        try {
          processedValue = new ObjectId(value);
        } catch (error) {
          // If conversion fails, keep original value
          processedValue = value;
        }
      }
      
      switch (operator) {
        case 'eq':
          mongoFilter[field] = processedValue;
          break;
        case 'neq':
          mongoFilter[field] = { $ne: processedValue };
          break;
        case 'gt':
          mongoFilter[field] = { $gt: processedValue };
          break;
        case 'gte':
          mongoFilter[field] = { $gte: processedValue };
          break;
        case 'lt':
          mongoFilter[field] = { $lt: processedValue };
          break;
        case 'lte':
          mongoFilter[field] = { $lte: processedValue };
          break;
        case 'in':
          mongoFilter[field] = { $in: processedValue };
          break;
        case 'nin':
          mongoFilter[field] = { $nin: processedValue };
          break;
        case 'like':
        case 'contains':
          mongoFilter[field] = { $regex: processedValue, $options: 'i' };
          break;
        case 'exists':
          mongoFilter[field] = { $exists: processedValue };
          break;
        case 'null':
          mongoFilter[field] = null;
          break;
        case 'notnull':
          mongoFilter[field] = { $ne: null };
          break;
        default:
          mongoFilter[field] = processedValue;
      }
    });
    
    return mongoFilter;
  }

  /**
   * Execute MongoDB query
   */
  async executeQuery<T = any>(
    nativeQuery: any, 
    options?: ExecutionOptions
  ): Promise<IntermediateQueryResult<T>> {
    this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('MongoDB database connection is not available');
    }

    const startTime = Date.now();
    
    try {
      const collection = this.db.collection(this.getCurrentCollection());
      let result: any;
      let data: T[] = [];
      
      // Handle different operation types
      if (Array.isArray(nativeQuery)) {
        // Read operation (aggregation pipeline)
        const cursor = collection.aggregate(nativeQuery, {
          maxTimeMS: options?.timeout || 30000,
          allowDiskUse: true,
          ...options?.driverOptions
        });
        data = await cursor.toArray();
      } else if (nativeQuery.operation) {
        // CRUD operations
        switch (nativeQuery.operation) {
          case 'insertOne':
            result = await collection.insertOne(nativeQuery.document);
            data = [{ ...nativeQuery.document, _id: result.insertedId }] as T[];
            break;
            
          case 'updateOne':
            result = await collection.updateOne(nativeQuery.filter, nativeQuery.update);
            if (result.modifiedCount > 0) {
              const updated = await collection.findOne(nativeQuery.filter);
              data = updated ? [updated] : [];
            }
            break;
            
          case 'replaceOne':
            result = await collection.replaceOne(nativeQuery.filter, nativeQuery.update);
            if (result.modifiedCount > 0) {
              const replaced = await collection.findOne(nativeQuery.filter);
              data = replaced ? [replaced] : [];
            }
            break;
            
          case 'deleteOne':
            result = await collection.deleteOne(nativeQuery.filter);
            data = [];
            break;
            
          default:
            throw new Error(`Unsupported operation: ${nativeQuery.operation}`);
        }
      }

      const executionTime = Date.now() - startTime;
      const queryResult = this.createResult(data, this.getCurrentQuery(), nativeQuery, executionTime);
      
      // Add operation metadata for CRUD operations
      if (result) {
        queryResult.metadata = {
          ...queryResult.metadata,
          insertedCount: result.insertedCount || 0,
          modifiedCount: result.modifiedCount || 0,
          deletedCount: result.deletedCount || 0,
          matchedCount: result.matchedCount || 0
        };
      }
      
      return queryResult;
    } catch (error) {
      throw new Error(`MongoDB query execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get MongoDB adapter capabilities
   */
  getCapabilities(): AdapterCapabilities {
    return {
      filterOperators: [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'nin', 'exists', 'null', 'notnull',
        'regex', 'like', 'ilike', 'contains',
        'startswith', 'endswith'
      ],
      joinTypes: [
        'lookup', 'left', 'inner', 'one-to-one',
        'one-to-many', 'many-to-one', 'many-to-many'
      ],
      aggregations: [
        'count', 'sum', 'avg', 'min', 'max',
        'group', 'distinct'
      ],
      fullTextSearch: true,
      transactions: true,
      nestedQueries: true,
      maxComplexity: 100,
      maxResultSize: 1000000
    };
  }

  /**
   * Initialize MongoDB adapter
   */
  async initialize(config: AdapterConfig): Promise<void> {
    await super.initialize(config);
    
    if (config.custom?.db) {
      this.db = config.custom.db;
    } else if (config.connection) {
      // Initialize MongoDB connection if not provided
      const { MongoClient } = await import('mongodb');
      const connectionString = config.connection.connectionString || 
        this.buildConnectionString(config.connection);
      
      const client = new MongoClient(connectionString);
      await client.connect();
      
      // Extract database name from connection string or use provided database
      let dbName = config.connection.database;
      if (!dbName && config.connection.connectionString) {
        // Extract database name from connection string
        const match = config.connection.connectionString.match(/\/([^/?]+)(\?|$)/);
        if (match) {
          dbName = match[1];
        }
      }
      
      this.db = client.db(dbName);
    }
  }

  /**
   * Test MongoDB connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert joins to MongoDB lookup stages
   */
  private convertJoins(joins: JoinClause[], sourceCollection: string): any[] {
    const stages: any[] = [];

    joins.forEach(join => {
      const lookupStages = this.convertSingleJoin(join, sourceCollection);
      if (lookupStages) {
        if (Array.isArray(lookupStages)) {
          stages.push(...lookupStages);
        } else {
          stages.push(lookupStages);
        }
      }
    });

    return stages;
  }

  /**
   * Convert single join to MongoDB lookup
   */
  private convertSingleJoin(join: JoinClause, sourceCollection: string): any | null {
    // Handle relationship-based joins
    if (join.relationship && this.relationshipRegistry) {
      const relationships = this.relationshipRegistry.getForTable ? 
        this.relationshipRegistry.getForTable(sourceCollection) :
        [];
      const relationship = relationships.find((rel: any) => rel.name === join.relationship!.name);

      if (relationship) {
        return this.createRelationshipLookup(join, relationship);
      }
    }

    // Fallback to manual join conditions
    if (join.on && join.on.length > 0) {
      const condition = join.on[0];
      return {
        $lookup: {
          from: join.target,
          localField: condition.local,
          foreignField: condition.foreign,
          as: join.alias || join.target
        }
      };
    }

    // Default simple lookup
    return {
      $lookup: {
        from: join.target,
        as: join.alias || join.target,
        pipeline: this.buildJoinPipeline(join)
      }
    };
  }

  private createRelationshipLookup(join: JoinClause, relationship: any): any {
    if (relationship.type === 'many-to-many' && relationship.junction) {
      // Many-to-many relationship with junction table - like products -> categories
      // For many-to-many, we need to first get junction records, then lookup the target
      const junctionPipeline = [
        // Get matching junction records
        {
          $match: {
            $expr: {
              $eq: [`$${relationship.junction.localKey}`, '$$local_value']
            }
          }
        }
      ];

      const targetPipeline = [
        // Match target records using junction foreign key
        {
          $match: {
            $expr: {
              $in: [`$${relationship.foreignField}`, '$$junction_ids']
            }
          }
        }
      ];

      // Add filters if specified  
      if (join.filter) {
        targetPipeline.push({
          $match: this.convertFilter(join.filter)
        });
      }

      // Add nested joins if any
      if (join.joins && join.joins.length > 0) {
        join.joins.forEach(nestedJoin => {
          const nestedLookups = this.convertSingleJoin(nestedJoin, join.target);
          if (Array.isArray(nestedLookups)) {
            targetPipeline.push(...nestedLookups);
          } else if (nestedLookups) {
            targetPipeline.push(nestedLookups);
          }
        });
      }

      // Return compound lookup: first junction, then target
      return [
        // First lookup: get junction records
        {
          $lookup: {
            from: relationship.junction.table,
            let: { local_value: `$${relationship.localField}` },
            pipeline: junctionPipeline,
            as: '_junction'
          }
        },
        // Second lookup: get target records using junction IDs
        {
          $lookup: {
            from: join.target,
            let: { 
              junction_ids: {
                $map: {
                  input: '$_junction',
                  as: 'j',
                  in: `$$j.${relationship.junction.foreignKey}`
                }
              }
            },
            pipeline: targetPipeline,
            as: join.alias || join.target
          }
        },
        // Clean up junction data
        {
          $unset: '_junction'
        }
      ];
    } else {
      // One-to-one, one-to-many, many-to-one
      const pipeline = [
        {
          $match: {
            $expr: {
              $eq: [`$${relationship.foreignField}`, '$$local_value']
            }
          }
        }
      ];

      // Add filters if specified
      if (join.filter) {
        pipeline.push({
          $match: this.convertFilter(join.filter)
        });
      }

      // Add nested joins if any
      if (join.joins && join.joins.length > 0) {
        join.joins.forEach(nestedJoin => {
          const nestedLookups = this.convertSingleJoin(nestedJoin, join.target);
          if (Array.isArray(nestedLookups)) {
            pipeline.push(...nestedLookups);
          } else if (nestedLookups) {
            pipeline.push(nestedLookups);
          }
        });
      }

      const lookup = {
        $lookup: {
          from: join.target,
          let: { local_value: `$${relationship.localField}` },
          pipeline: pipeline,
          as: join.alias || join.target
        }
      };

      // Handle unwind for one-to-one and many-to-one
      if (relationship.type === 'one-to-one' || relationship.type === 'many-to-one') {
        return [
          lookup,
          {
            $unwind: {
              path: `$${join.alias || join.target}`,
              preserveNullAndEmptyArrays: join.relationship?.preserveNull !== false
            }
          }
        ];
      }

      return lookup;
    }
  }

  private buildJoinPipeline(join: JoinClause): any[] {
    const pipeline: any[] = [];

    // Add filters
    if (join.filter) {
      pipeline.push({
        $match: this.convertFilter(join.filter)
      });
    }

    // Add nested joins
    if (join.joins && join.joins.length > 0) {
      join.joins.forEach(nestedJoin => {
        const nestedLookups = this.convertSingleJoin(nestedJoin, join.target);
        if (Array.isArray(nestedLookups)) {
          pipeline.push(...nestedLookups);
        } else if (nestedLookups) {
          pipeline.push(nestedLookups);
        }
      });
    }

    return pipeline;
  }

  /**
   * Convert filter condition to MongoDB match expression
   */
  private convertFilter(filter: FilterCondition): any {
    const result: any = {};

    // Handle field conditions
    if (filter.conditions && filter.conditions.length > 0) {
      const conditions = filter.conditions.map(condition => 
        this.convertFieldCondition(condition)
      );
      if (conditions.length === 1) {
        Object.assign(result, conditions[0]);
      } else {
        result[`$${filter.operator}` || '$and'] = conditions;
      }
    }

    // Handle nested conditions
    if (filter.nested && filter.nested.length > 0) {
      const nestedConditions = filter.nested.map(nested => 
        this.convertFilter(nested)
      );

      if (filter.operator === 'or') {
        result.$or = nestedConditions;
      } else if (filter.operator === 'not') {
        result.$not = nestedConditions[0];
      } else {
        // Default to 'and'
        if (result.$and) {
          result.$and.push(...nestedConditions);
        } else {
          result.$and = nestedConditions;
        }
      }
    }

    // Handle logical operator for conditions
    if (filter.operator && filter.conditions && filter.conditions.length > 0) {
      const conditions = filter.conditions.map(condition => 
        this.convertFieldCondition(condition)
      );

      if (filter.operator === 'or') {
        result.$or = conditions;
      } else if (filter.operator === 'not') {
        result.$not = { $and: conditions };
      }
    }

    return result;
  }

  /**
   * Convert field condition to MongoDB expression
   */
  private convertFieldCondition(condition: FieldCondition): any {
    const { field, operator, value } = condition;

    switch (operator) {
      case 'eq':
        return { [field]: value };
      
      case 'neq':
        return { [field]: { $ne: value } };
      
      case 'gt':
        return { [field]: { $gt: value } };
      
      case 'gte':
        return { [field]: { $gte: value } };
      
      case 'lt':
        return { [field]: { $lt: value } };
      
      case 'lte':
        return { [field]: { $lte: value } };
      
      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      
      case 'nin':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      
      case 'exists':
        return { [field]: { $exists: value === true } };
      
      case 'null':
        return { [field]: null };
      
      case 'notnull':
        return { [field]: { $ne: null } };
      
      case 'regex':
        return { [field]: { $regex: value, $options: 'i' } };
      
      case 'like':
      case 'ilike':
        const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
        return { [field]: { $regex: pattern, $options: 'i' } };
      
      case 'contains':
        return { [field]: { $regex: value, $options: 'i' } };
      
      case 'startswith':
        return { [field]: { $regex: `^${value}`, $options: 'i' } };
      
      case 'endswith':
        return { [field]: { $regex: `${value}$`, $options: 'i' } };
      
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Convert select clause to MongoDB projection
   */
  // private convertProjection(select: any): any {
  //   const projection: any = {};

  //   if (select.fields && select.fields.length > 0) {
  //     select.fields.forEach((field: string) => {
  //       if (field.includes('.')) {
  //         projection[field] = 1;
  //       } else if (field === '*') {
  //         return {};
  //       } else {
  //         projection[field] = 1;
  //       }
  //     });
  //   }

  //   // Handle aliases
  //   if (select.aliases) {
  //     Object.entries(select.aliases).forEach(([alias, field]) => {
  //       projection[alias] = `$${field}`;
  //     });
  //   }

  //   return projection;
  // }

  /**
   * Convert sort clauses to MongoDB sort object
   */
  private convertSort(sorts: SortClause[]): any {
    const sortObj: any = {};

    sorts.forEach(sort => {
      sortObj[sort.field] = sort.direction === 'desc' ? -1 : 1;
    });

    return sortObj;
  }

  private buildConnectionString(config: any): string {
    const { host = 'localhost', port = 27017, username, password, database } = config;
    
    let connectionString = 'mongodb://';
    
    if (username && password) {
      connectionString += `${username}:${password}@`;
    }
    
    connectionString += `${host}:${port}`;
    
    if (database) {
      connectionString += `/${database}`;
    }

    return connectionString;
  }

  // Temporary storage for current query context
  private currentQuery?: IntermediateQuery;
  private currentCollection?: string;

  private getCurrentQuery(): IntermediateQuery {
    return this.currentQuery || {} as IntermediateQuery;
  }

  private getCurrentCollection(): string {
    return this.currentCollection || 'default';
  }

  // Method to set current context (to be called before execution)
  setCurrentContext(query: IntermediateQuery): void {
    this.currentQuery = query;
    this.currentCollection = query.collection;
  }
}