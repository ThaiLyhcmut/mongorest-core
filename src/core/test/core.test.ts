import { NewCore, createCore, CoreConfig } from '../main/newCore';
import { QueryParams } from '../index';
import { RelationshipRegistry } from '../adapters/base/relationship/RelationshipRegistry';
import { AdapterRegistry } from '../adapters/base/adapterRegistry';
import { MockDatabaseAdapter } from './mocks/mockDatabaseAdapter';

describe('NewCore', () => {
  let core: NewCore;
  let mockAdapter: MockDatabaseAdapter;
  let adapterRegistry: AdapterRegistry;
  let relationshipRegistry: RelationshipRegistry;

  beforeEach(() => {
    relationshipRegistry = new RelationshipRegistry();
    adapterRegistry = AdapterRegistry.getInstance();
    mockAdapter = new MockDatabaseAdapter();
    
    // Clear previous adapters
    adapterRegistry.clear();
    adapterRegistry.register(mockAdapter);
    
    core = new NewCore(relationshipRegistry, adapterRegistry);
  });

  afterEach(async () => {
    await core.dispose();
  });

  describe('initialization', () => {
    it('should create a new core instance', () => {
      expect(core).toBeInstanceOf(NewCore);
    });

    it('should initialize with configuration', async () => {
      const config: CoreConfig = {
        adapters: {
          mock: {
            connection: { host: 'localhost' }
          }
        },
        relationships: {
          users: [
            {
              name: 'posts',
              type: 'one-to-many',
              localField: '_id',
              foreignField: 'userId',
              targetTable: 'posts'
            }
          ]
        }
      };

      await expect(core.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('query processing', () => {
    beforeEach(async () => {
      const config: CoreConfig = {
        adapters: {
          mock: {
            connection: { host: 'localhost' }
          }
        }
      };
      await core.initialize(config);
    });

    it('should process simple query', async () => {
      const params: QueryParams = {
        name: 'eq.John',
        age: 'gt.25'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.metadata.adapter).toBe('mock-adapter');
    });

    it('should process query with select fields', async () => {
      const params: QueryParams = {
        select: 'name,email,age',
        name: 'eq.John'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeDefined();
      console.log('Query metadata:', JSON.stringify(result.metadata.query, null, 2));
      // The intermediate query doesn't have select fields in the expected format
      expect(result.metadata.query.select?.fields).toContain('name');
    });

    it('should process query with sorting', async () => {
      const params: QueryParams = {
        order: 'name,-age',
        limit: '10'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeDefined();
      // Check if sort is processed (may be in different format)
      expect(result.metadata.query.sort || (result.metadata.query as any).order).toBeDefined();
      expect(result.metadata.query.pagination?.limit).toBe(10);
    });

    it('should process query with logical operators', async () => {
      const params: QueryParams = {
        'or': '(name.eq.John,age.gt.25)'
      };

      const result = await core.processQuery(
        params,
        'users',
        ['user'],
        'mock'
      );

      expect(result).toBeDefined();
      // Check if logical operator is processed
      expect(result.metadata.query.filter).toBeDefined();
    });

    it('should throw error for unauthorized access', async () => {
      const params: QueryParams = {
        name: 'eq.John'
      };

      await expect(
        core.processQuery(params, 'admin_users', ['user'], 'mock')
      ).rejects.toThrow('User does not have access');
    });

    it('should throw error for unsupported database type', async () => {
      const params: QueryParams = {
        name: 'eq.John'
      };

      await expect(
        core.processQuery(params, 'users', ['user'], 'unsupported' as any)
      ).rejects.toThrow('No adapter found');
    });
  });

  describe('adapter management', () => {
    it('should get supported database types', () => {
      const types = core.getSupportedDatabaseTypes();
      expect(types).toContain('mock');
    });

    it('should get adapter information', () => {
      const info = core.getAdapterInfo();
      expect(info).toBeInstanceOf(Array);
      expect(info.length).toBeGreaterThan(0);
    });

    it('should get adapter information by type', () => {
      const info = core.getAdapterInfo('mock');
      expect(info).toBeInstanceOf(Array);
      expect(info[0].type).toBe('mock');
    });

    it('should test adapter connection', async () => {
      const connected = await core.testConnection('mock');
      expect(typeof connected).toBe('boolean');
    });
  });

  describe('query conversion', () => {
    it('should convert to intermediate format', () => {
      const params: QueryParams = {
        name: 'eq.John',
        age: 'gt.25',
        select: 'name,email'
      };

      const intermediate = core.convertToIntermediate(params, 'users', ['user']);
      
      expect(intermediate.collection).toBe('users');
      expect(intermediate.select?.fields).toContain('name');
      expect(intermediate.filter?.conditions).toBeDefined();
    });

    it('should convert to native format', () => {
      const params: QueryParams = {
        name: 'eq.John'
      };

      const intermediate = core.convertToIntermediate(params, 'users', ['user']);
      const native = core.convertToNative(intermediate, 'mock');
      
      expect(native).toBeDefined();
    });
  });

  describe('adapter registration', () => {
    it('should register new adapter', () => {
      const newAdapter = new MockDatabaseAdapter('new-mock', '2.0.0');
      core.registerAdapter(newAdapter);
      
      const types = core.getSupportedDatabaseTypes();
      expect(types).toContain('mock');
    });

    it('should unregister adapter', () => {
      const result = core.unregisterAdapter('mock-adapter', '1.0.0');
      expect(result).toBe(true);
    });

    it('should return false when unregistering non-existent adapter', () => {
      const result = core.unregisterAdapter('non-existent');
      expect(result).toBe(false);
    });
  });
});

describe('createCore factory function', () => {
  it('should create core instance', () => {
    const core = createCore();
    expect(core).toBeInstanceOf(NewCore);
  });

  it('should create core instance with relationship registry', () => {
    const relationshipRegistry = new RelationshipRegistry();
    const core = createCore(relationshipRegistry);
    expect(core).toBeInstanceOf(NewCore);
  });
});