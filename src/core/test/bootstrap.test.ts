import { CoreBootstrap, createCoreSystem, quickStart, BootstrapConfig } from '../bootstrap';
import { NewCore } from '../main/newCore';
import { AdapterRegistry } from '../adapters/base/adapterRegistry';
import { RelationshipRegistry } from '../adapters/base/relationship/RelationshipRegistry';

describe('CoreBootstrap', () => {
  let bootstrap: CoreBootstrap;

  beforeEach(() => {
    bootstrap = new CoreBootstrap();
  });

  afterEach(async () => {
    await bootstrap.dispose();
  });

  describe('initialization', () => {
    it('should create a new CoreBootstrap instance', () => {
      expect(bootstrap).toBeInstanceOf(CoreBootstrap);
    });

    it('should initialize with builtin adapters', async () => {
      const core = await bootstrap.initializeWithBuiltinAdapters();
      expect(core).toBeInstanceOf(NewCore);
      
      const supportedTypes = core.getSupportedDatabaseTypes();
      expect(supportedTypes).toContain('mongodb');
      expect(supportedTypes).toContain('postgresql');
      expect(supportedTypes).toContain('mysql');
      expect(supportedTypes).toContain('elasticsearch');
    });

    it('should initialize with custom configuration', async () => {
      const config: BootstrapConfig = {
        includeBuiltinAdapters: true,
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

      const core = await bootstrap.initializeWithConfig(config);
      expect(core).toBeInstanceOf(NewCore);
    });

    it.skip('should throw error when relationships are missing in config', async () => {
      const config: BootstrapConfig = {
        includeBuiltinAdapters: true,
        relationships: undefined
      };

      await expect(bootstrap.initializeWithConfig(config)).rejects.toThrow('not relationship');
    });
  });

  describe('adapter management', () => {
    it('should get system status', async () => {
      await bootstrap.initializeWithBuiltinAdapters();
      const status = bootstrap.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.adapters).toBeInstanceOf(Array);
      expect(status.adapters.length).toBeGreaterThan(0);
      expect(status.supportedDatabaseTypes).toBeInstanceOf(Array);
    });

    it('should test adapter connections', async () => {
      await bootstrap.initializeWithBuiltinAdapters();
      const results = await bootstrap.testConnections();
      
      expect(results).toBeInstanceOf(Array);
      results.forEach(result => {
        expect(result).toHaveProperty('adapter');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('connected');
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when getting core before initialization', () => {
      expect(() => bootstrap.getCore()).toThrow('Core is not initialized');
    });
  });
});

describe('Factory Functions', () => {
  describe('createCoreSystem', () => {
    it('should create core system without config', async () => {
      const core = await createCoreSystem();
      expect(core).toBeInstanceOf(NewCore);
      await core.dispose();
    });

    it.skip('should create core system with config', async () => {
      const config: BootstrapConfig = {
        includeBuiltinAdapters: true,
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

      const core = await createCoreSystem(config);
      expect(core).toBeInstanceOf(NewCore);
      await core.dispose();
    });
  });

  describe.skip('quickStart', () => {
    it('should create core system with quick start', async () => {
      const databaseConfigs = {
        mongodb: {
          connection: {
            connectionString: 'mongodb://localhost:27017/test'
          }
        }
      };

      const core = await quickStart(databaseConfigs);
      expect(core).toBeInstanceOf(NewCore);
      await core.dispose();
    });

    it('should create core system with quick start without config', async () => {
      const core = await quickStart();
      expect(core).toBeInstanceOf(NewCore);
      await core.dispose();
    });
  });
});