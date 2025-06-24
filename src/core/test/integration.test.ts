import { CoreBootstrap, createCoreSystem } from '../bootstrap';
import { NewCore } from '../main/newCore';
import { QueryParams } from '../index';
import { MockDatabaseAdapter } from './mocks/mockDatabaseAdapter';
import { RelationshipRegistry } from '../adapters/base/relationship/RelationshipRegistry';

describe('Core Integration Tests', () => {
  let bootstrap: CoreBootstrap;
  let core: NewCore;

  beforeEach(async () => {
    bootstrap = new CoreBootstrap();
    
    // Initialize with mock adapters for testing
    const relationshipRegistry = new RelationshipRegistry();
    
    // Setup test relationships
    relationshipRegistry.registerBulk({
      users: [
        {
          name: 'profile',
          type: 'one-to-one',
          localField: 'id',
          foreignField: 'user_id',
          targetTable: 'user_profiles'
        },
        {
          name: 'posts',
          type: 'one-to-many',
          localField: 'id',
          foreignField: 'user_id',
          targetTable: 'posts'
        }
      ],
      posts: [
        {
          name: 'user',
          type: 'many-to-one',
          localField: 'user_id',
          foreignField: 'id',
          targetTable: 'users'
        },
        {
          name: 'comments',
          type: 'one-to-many',
          localField: 'id',
          foreignField: 'post_id',
          targetTable: 'comments'
        }
      ]
    });

    core = await createCoreSystem({
      includeBuiltinAdapters: false,
      relationships: {
        users: [
          {
            name: 'profile',
            type: 'one-to-one',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'user_profiles'
          },
          {
            name: 'posts',
            type: 'one-to-many',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'posts'
          }
        ]
      }
    });

    // Register mock adapter
    const mockAdapter = new MockDatabaseAdapter();
    core.registerAdapter(mockAdapter);

    await core.initialize({
      adapters: {
        'mock-adapter': {
          connection: { host: 'localhost' }
        }
      }
    });
  });

  afterEach(async () => {
    await core?.dispose();
  });

  describe('end-to-end query processing', () => {
    it('should process a complete query workflow', async () => {
      const params: QueryParams = {
        name: 'eq.John',
        age: 'gt.25',
        select: 'name,email,age',
        order: 'created_at',
        limit: '10',
        offset: '0'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeValidResult();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.metadata.adapter).toBe('mock-adapter');
      expect(result.metadata.query.collection).toBe('users');
      expect(result.metadata.query.filter?.conditions).toHaveLength(2);
      expect(result.metadata.query.select?.fields).toEqual(['name', 'email', 'age']);
      expect(result.metadata.query.sort?.[0].field).toBe('created_at');
      expect(result.metadata.query.pagination?.limit).toBe(10);
    });

    it('should handle complex queries with joins and logical operators', async () => {
      const params: QueryParams = {
        'or': '(status.eq.active,verified.eq.true)',
        'and': '(age.gte.18,country.eq.US)',
        select: 'name,email,look_posts(title,content)',
        order: 'name,-created_at',
        limit: '20'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeValidResult();
      expect(result.metadata.query.filter?.operator).toBe('and');
      expect(result.metadata.query.joins).toBeDefined();
      expect(result.metadata.query.joins?.length).toBeGreaterThan(0);
    });

    it('should apply RBAC restrictions correctly', async () => {
      const params: QueryParams = {
        select: 'name,email,password,secret_key',
        name: 'eq.John'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'], // Regular user role
        'mock'
      );

      expect(result).toBeValidResult();
      
      // RBAC should filter out unauthorized fields
      const allowedFields = result.metadata.query.select?.fields || [];
      expect(allowedFields).not.toContain('password');
      expect(allowedFields).not.toContain('secret_key');
    });

    it('should reject unauthorized collection access', async () => {
      const params: QueryParams = {
        name: 'eq.Admin'
      };

      await expect(
        core.processQuery(params, 'admin_users', ['user'], 'mock')
      ).rejects.toThrow('User does not have access');
    });
  });

  describe('adapter integration', () => {
    it('should route queries to correct adapter', async () => {
      // Register multiple adapters
      const mongoAdapter = new MockDatabaseAdapter('mongo-adapter', '1.0.0', 'mongodb');
      const pgAdapter = new MockDatabaseAdapter('pg-adapter', '1.0.0', 'postgresql');
      
      core.registerAdapter(mongoAdapter);
      core.registerAdapter(pgAdapter);

      const params: QueryParams = { name: 'eq.John' };

      // Test MongoDB adapter
      const mongoResult = await core.processQuery(params, 'users', ['user'], 'mongodb');
      expect(mongoResult.metadata.adapter).toBe('mongo-adapter');

      // Test PostgreSQL adapter
      const pgResult = await core.processQuery(params, 'users', ['user'], 'postgresql');
      expect(pgResult.metadata.adapter).toBe('pg-adapter');
    });

    it('should handle adapter validation failures', async () => {
      const mockAdapter = new MockDatabaseAdapter();
      mockAdapter.mockValidationFailure([
        {
          code: 'UNSUPPORTED_OPERATOR',
          message: 'Operator "custom" is not supported',
          path: 'filter.conditions[0].operator'
        }
      ]);

      core.registerAdapter(mockAdapter);

      const params: QueryParams = {
        field: 'custom.value' // This should trigger validation error
      };

      await expect(
        core.processQuery(params, 'users', ['user'], 'mock')
      ).rejects.toThrow('Query validation failed');
    });

    it('should handle adapter execution failures', async () => {
      const mockAdapter = new MockDatabaseAdapter();
      mockAdapter.mockExecutionFailure(new Error('Database connection failed'));

      core.registerAdapter(mockAdapter);

      const params: QueryParams = { name: 'eq.John' };

      await expect(
        core.processQuery(params, 'users', ['user'], 'mock')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('relationship enhancement', () => {
    it('should enhance joins with relationship information', async () => {
      const params: QueryParams = {
        select: 'name,look_posts(title,content)'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result.metadata.query.joins).toBeDefined();
      expect(result.metadata.query.joins?.[0].target).toBe('posts');
      expect(result.metadata.query.joins?.[0].relationship?.name).toBe('posts');
    });

    it('should handle nested relationship lookups', async () => {
      const params: QueryParams = {
        select: 'name,look_posts(title,look_comments(text,author))'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result.metadata.query.joins).toBeDefined();
      expect(result.metadata.query.joins?.[0].joins).toBeDefined();
      expect(result.metadata.query.joins?.[0].joins?.[0].target).toBe('comments');
    });
  });

  describe('query conversion pipeline', () => {
    it('should convert through complete pipeline: params -> intermediate -> native', async () => {
      const params: QueryParams = {
        name: 'eq.John',
        age: 'gt.25',
        select: 'name,email',
        order: 'created_at',
        limit: '10'
      };

      // Test intermediate conversion
      const intermediate = core.convertToIntermediate(params, 'users', ['user']);
      expect(intermediate).toBeValidQuery();
      expect(intermediate.collection).toBe('users');
      expect(intermediate.filter?.conditions).toHaveLength(2);

      // Test native conversion
      const native = core.convertToNative(intermediate, 'mock');
      expect(native).toBeDefined();

      // Test full execution
      const result = await core.processQuery(params, 'users', ['user'], 'mock');
      expect(result).toBeValidResult();
    });

    it('should preserve query metadata through pipeline', async () => {
      const params: QueryParams = {
        name: 'eq.John',
        debug: 'true'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['admin'],
        'mock'
      );

      expect(result.metadata.query.metadata?.originalParams).toEqual(params);
      expect(result.metadata.query.metadata?.roles).toEqual(['admin']);
      expect(result.metadata.query.metadata?.source).toBe('rest-api');
      expect(result.metadata.query.metadata?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large number of conditions efficiently', async () => {
      const params: QueryParams = {};
      
      // Create 100 filter conditions
      for (let i = 0; i < 100; i++) {
        params[`field${i}`] = `eq.value${i}`;
      }

      const startTime = Date.now();
      const result = await core.processQuery(params, 'users', ['user'], 'mock');
      const endTime = Date.now();

      expect(result).toBeValidResult();
      expect(result.metadata.query.filter?.conditions?.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent queries', async () => {
      const params: QueryParams = { name: 'eq.John' };

      const promises = Array.from({ length: 10 }, (_, i) =>
        core.processQuery(
          { ...params, id: `eq.${i}` },
          'users',
          ['user'],
          'mock'
        )
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeValidResult();
      });
    });
  });

  describe('error handling and resilience', () => {
    it('should handle malformed query parameters gracefully', async () => {
      const malformedParams = {
        'invalid.format': 'badvalue',
        '': 'empty.key',
        'null.field': null as any
      };

      // Should not throw, but may produce empty or filtered results
      const result = await core.processQuery(
        malformedParams,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeValidResult();
    });

    it('should provide detailed error information for debugging', async () => {
      try {
        await core.processQuery(
          { name: 'eq.John' },
          'users',
          ['invalid_role'],
          'mock'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('does not have access');
      }
    });

    it('should handle adapter unavailability gracefully', async () => {
      await expect(
        core.processQuery(
          { name: 'eq.John' },
          'users',
          ['user'],
          'unavailable_adapter' as any
        )
      ).rejects.toThrow('No adapter found');
    });
  });
});

describe('Bootstrap Integration', () => {
  it('should initialize complete system from configuration', async () => {
    const config = {
      includeBuiltinAdapters: true,
      relationships: {
        users: [
          {
            name: 'posts',
            type: 'one-to-many',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'posts'
          }
        ]
      },
      core: {
        adapters: {
          mongodb: {
            connection: {
              connectionString: 'mongodb://localhost:27017/test'
            }
          }
        }
      }
    };

    const core = await createCoreSystem(config);
    
    expect(core).toBeInstanceOf(NewCore);
    expect(core.getSupportedDatabaseTypes()).toContain('mongodb');
    
    await core.dispose();
  });

  it('should provide system status and health checks', async () => {
    const bootstrap = new CoreBootstrap();
    await bootstrap.initializeWithBuiltinAdapters();
    
    const status = bootstrap.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.adapters).toBeInstanceOf(Array);
    expect(status.supportedDatabaseTypes).toBeInstanceOf(Array);
    
    const connectionTests = await bootstrap.testConnections();
    expect(connectionTests).toBeInstanceOf(Array);
    
    await bootstrap.dispose();
  });
});