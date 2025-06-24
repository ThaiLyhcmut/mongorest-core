import { MongoDBAdapter } from '../../adapters/mongodb/mongodbAdapter';
import { RelationshipRegistry } from '../../adapters/base/relationship/RelationshipRegistry';
import { IntermediateQuery } from '../../types/intermediateQuery';
import { AdapterConfig } from '../../adapters/base/databaseAdapter';

describe('MongoDBAdapter', () => {
  let adapter: MongoDBAdapter;
  let relationshipRegistry: RelationshipRegistry;

  beforeEach(() => {
    relationshipRegistry = new RelationshipRegistry();
    adapter = new MongoDBAdapter(relationshipRegistry);
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  describe('adapter properties', () => {
    it('should have correct adapter properties', () => {
      expect(adapter.name).toBe('mongodb');
      expect(adapter.type).toBe('mongodb');
      expect(adapter.version).toBeDefined();
    });

    it('should return MongoDB capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.filterOperators).toContain('eq');
      expect(capabilities.filterOperators).toContain('gt');
      expect(capabilities.filterOperators).toContain('in');
      expect(capabilities.filterOperators).toContain('regex');
      
      expect(capabilities.joinTypes).toContain('lookup');
      expect(capabilities.joinTypes).toContain('embed');
      
      expect(capabilities.aggregations).toContain('count');
      expect(capabilities.aggregations).toContain('sum');
      expect(capabilities.aggregations).toContain('group');
      
      expect(capabilities.fullTextSearch).toBe(true);
      expect(capabilities.transactions).toBe(true);
      expect(capabilities.nestedQueries).toBe(true);
    });
  });

  describe('query conversion', () => {
    it('should convert simple filter query', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'name', operator: 'eq', value: 'John' },
            { field: 'age', operator: 'gt', value: 25 }
          ]
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toBeInstanceOf(Array);
      expect(pipeline[0]).toEqual({
        $match: {
          name: { $eq: 'John' },
          age: { $gt: 25 }
        }
      });
    });

    it('should convert query with logical operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          operator: 'or',
          conditions: [
            { field: 'name', operator: 'eq', value: 'John' },
            { field: 'age', operator: 'gt', value: 25 }
          ]
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline[0]).toEqual({
        $match: {
          $or: [
            { name: { $eq: 'John' } },
            { age: { $gt: 25 } }
          ]
        }
      });
    });

    it('should convert query with array operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'tags', operator: 'in', value: ['admin', 'user'] },
            { field: 'status', operator: 'nin', value: ['inactive', 'banned'] }
          ]
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline[0]).toEqual({
        $match: {
          tags: { $in: ['admin', 'user'] },
          status: { $nin: ['inactive', 'banned'] }
        }
      });
    });

    it('should convert query with text operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'name', operator: 'like', value: 'John%' },
            { field: 'email', operator: 'regex', value: '@gmail\\.com$' }
          ]
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline[0].$match.name).toHaveProperty('$regex');
      expect(pipeline[0].$match.email).toEqual({ $regex: '@gmail\\.com$' });
    });

    it('should convert query with null operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'deleted_at', operator: 'null', value: null },
            { field: 'verified_at', operator: 'notnull', value: null }
          ]
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline[0]).toEqual({
        $match: {
          deleted_at: { $eq: null },
          verified_at: { $ne: null }
        }
      });
    });

    it('should convert query with select fields', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        select: {
          fields: ['name', 'email', 'age']
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual({
        $project: {
          name: 1,
          email: 1,
          age: 1
        }
      });
    });

    it('should convert query with excluded fields', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        select: {
          exclude: ['password', 'secret_key']
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual({
        $project: {
          password: 0,
          secret_key: 0
        }
      });
    });

    it('should convert query with sorting', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        sort: [
          { field: 'name', direction: 'asc' },
          { field: 'created_at', direction: 'desc' }
        ]
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual({
        $sort: {
          name: 1,
          created_at: -1
        }
      });
    });

    it('should convert query with pagination', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        pagination: {
          offset: 20,
          limit: 10
        }
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual({ $skip: 20 });
      expect(pipeline).toContainEqual({ $limit: 10 });
    });

    it('should convert query with joins/lookups', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        joins: [
          {
            type: 'lookup',
            target: 'posts',
            alias: 'user_posts',
            on: [
              { local: '_id', foreign: 'user_id', operator: 'eq' }
            ]
          }
        ]
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual({
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'user_id',
          as: 'user_posts'
        }
      });
    });

    it('should convert complex query with all features', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' }
          ],
          nested: [
            {
              operator: 'or',
              conditions: [
                { field: 'role', operator: 'eq', value: 'admin' },
                { field: 'permissions', operator: 'in', value: ['read', 'write'] }
              ]
            }
          ]
        },
        select: {
          fields: ['name', 'email', 'role']
        },
        sort: [
          { field: 'created_at', direction: 'desc' }
        ],
        pagination: {
          offset: 0,
          limit: 50
        },
        joins: [
          {
            type: 'lookup',
            target: 'user_profiles',
            alias: 'profile',
            on: [
              { local: '_id', foreign: 'user_id', operator: 'eq' }
            ]
          }
        ]
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toBeInstanceOf(Array);
      expect(pipeline.length).toBeGreaterThan(1);
      
      // Should have match stage
      expect(pipeline.some(stage => stage.$match)).toBe(true);
      
      // Should have lookup stage
      expect(pipeline.some(stage => stage.$lookup)).toBe(true);
      
      // Should have project stage
      expect(pipeline.some(stage => stage.$project)).toBe(true);
      
      // Should have sort stage
      expect(pipeline.some(stage => stage.$sort)).toBe(true);
      
      // Should have skip and limit stages
      expect(pipeline.some(stage => stage.$skip !== undefined)).toBe(true);
      expect(pipeline.some(stage => stage.$limit !== undefined)).toBe(true);
    });
  });

  describe('query validation', () => {
    it('should validate supported operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'name', operator: 'eq', value: 'John' },
            { field: 'age', operator: 'gt', value: 25 }
          ]
        }
      };

      const result = adapter.validateQuery(query);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject unsupported operators', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'name', operator: 'unsupported' as any, value: 'John' }
          ]
        }
      };

      const result = adapter.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'UNSUPPORTED_OPERATOR',
          message: expect.stringContaining('unsupported')
        })
      );
    });

    it('should validate supported join types', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        joins: [
          {
            type: 'lookup',
            target: 'posts',
            alias: 'user_posts',
            on: [{ local: '_id', foreign: 'user_id', operator: 'eq' }]
          }
        ]
      };

      const result = adapter.validateQuery(query);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject unsupported join types', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        joins: [
          {
            type: 'full' as any,
            target: 'posts',
            alias: 'user_posts',
            on: [{ local: '_id', foreign: 'user_id', operator: 'eq' }]
          }
        ]
      };

      const result = adapter.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'UNSUPPORTED_JOIN_TYPE'
        })
      );
    });

    it('should require collection name', () => {
      const query: IntermediateQuery = {
        collection: '',
        filter: {
          conditions: [
            { field: 'name', operator: 'eq', value: 'John' }
          ]
        }
      };

      const result = adapter.validateQuery(query);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_COLLECTION'
        })
      );
    });
  });

  describe('initialization and connection', () => {
    it('should initialize with valid configuration', async () => {
      const config: AdapterConfig = {
        connection: {
          connectionString: 'mongodb://localhost:27017/test'
        }
      };

      await expect(adapter.initialize(config)).resolves.not.toThrow();
    });

    it('should test connection', async () => {
      // Mock connection test - in real implementation this would test actual MongoDB connection
      const connected = await adapter.testConnection();
      expect(typeof connected).toBe('boolean');
    });
  });

  describe('aggregation support', () => {
    it('should convert aggregation queries', () => {
      const query: IntermediateQuery = {
        collection: 'orders',
        aggregations: [
          {
            type: 'group',
            field: 'customer_id',
            alias: 'customer_group'
          },
          {
            type: 'sum',
            field: 'total',
            alias: 'total_amount'
          },
          {
            type: 'count',
            alias: 'order_count'
          }
        ]
      };

      const pipeline = adapter.convertQuery(query);
      
      expect(pipeline).toContainEqual(
        expect.objectContaining({
          $group: expect.any(Object)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle malformed queries gracefully', () => {
      const query = {
        collection: 'users',
        filter: null
      } as any;

      expect(() => adapter.convertQuery(query)).not.toThrow();
    });

    it('should handle empty collections gracefully', () => {
      const query: IntermediateQuery = {
        collection: ''
      };

      const result = adapter.validateQuery(query);
      expect(result.valid).toBe(false);
    });
  });
});