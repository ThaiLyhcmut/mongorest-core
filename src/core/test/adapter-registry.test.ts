import { AdapterRegistry, AdapterPluginSystem } from '../adapters/base/adapterRegistry';
import { MockDatabaseAdapter } from './mocks/mockDatabaseAdapter';
import { DatabaseAdapter, DatabaseType } from '../adapters/base/databaseAdapter';

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;
  let mockAdapter: MockDatabaseAdapter;

  beforeEach(() => {
    // Create a fresh registry instance for testing by bypassing singleton
    registry = Object.create(AdapterRegistry.prototype);
    (registry as any).adapters = new Map();
    (registry as any).typeMap = new Map();
    mockAdapter = new MockDatabaseAdapter();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AdapterRegistry.getInstance();
      const instance2 = AdapterRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('adapter registration', () => {
    it('should register adapter successfully', () => {
      registry.register(mockAdapter);
      
      expect(registry.hasAdapter('mock-adapter', '1.0.0')).toBe(true);
      expect(registry.supportsType('mock')).toBe(true);
    });

    it('should warn when registering duplicate adapter', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      registry.register(mockAdapter);
      registry.register(mockAdapter); // Register again
      
      expect(consoleSpy).toHaveBeenCalledWith('Adapter mock-adapter@1.0.0 is already registered, skipping...');
      consoleSpy.mockRestore();
    });

    it('should register multiple adapters of different types', () => {
      const adapter2 = new MockDatabaseAdapter('postgres-adapter', '2.0.0', 'postgresql');
      
      registry.register(mockAdapter);
      registry.register(adapter2);
      
      expect(registry.getSupportedTypes()).toEqual(['mock', 'postgresql']);
    });
  });

  describe('adapter retrieval', () => {
    beforeEach(() => {
      registry.register(mockAdapter);
    });

    it('should retrieve adapter by name and version', () => {
      const adapter = registry.getAdapter('mock-adapter', '1.0.0');
      expect(adapter).toBe(mockAdapter);
    });

    it('should retrieve adapter by name only (latest version)', () => {
      const adapter2 = new MockDatabaseAdapter('mock-adapter', '2.0.0');
      registry.register(adapter2);
      
      const adapter = registry.getAdapter('mock-adapter');
      expect(adapter?.version).toBe('2.0.0');
    });

    it('should return null for non-existent adapter', () => {
      const adapter = registry.getAdapter('non-existent');
      expect(adapter).toBeNull();
    });

    it('should retrieve adapter by type', () => {
      const adapter = registry.getAdapterByType('mock');
      expect(adapter).toBe(mockAdapter);
    });

    it('should retrieve preferred adapter by type and name', () => {
      const adapter2 = new MockDatabaseAdapter('preferred-adapter', '1.0.0');
      registry.register(adapter2);
      
      const adapter = registry.getAdapterByType('mock', 'preferred-adapter');
      expect(adapter?.name).toBe('preferred-adapter');
    });

    it('should return null for unsupported type', () => {
      const adapter = registry.getAdapterByType('unsupported' as DatabaseType);
      expect(adapter).toBeNull();
    });
  });

  describe('adapter listing', () => {
    beforeEach(() => {
      registry.register(mockAdapter);
      const adapter2 = new MockDatabaseAdapter('adapter2', '2.0.0', 'postgresql');
      registry.register(adapter2);
    });

    it('should list all adapters', () => {
      const adapters = registry.listAdapters();
      
      expect(adapters).toHaveLength(2);
      expect(adapters[0]).toHaveProperty('name');
      expect(adapters[0]).toHaveProperty('type');
      expect(adapters[0]).toHaveProperty('version');
      expect(adapters[0]).toHaveProperty('capabilities');
    });

    it('should list adapters by type', () => {
      const mockAdapters = registry.listAdaptersByType('mock');
      const pgAdapters = registry.listAdaptersByType('postgresql');
      
      expect(mockAdapters).toHaveLength(1);
      expect(pgAdapters).toHaveLength(1);
      expect(mockAdapters[0].type).toBe('mock');
      expect(pgAdapters[0].type).toBe('postgresql');
    });

    it('should return empty array for unsupported type', () => {
      const adapters = registry.listAdaptersByType('unsupported' as DatabaseType);
      expect(adapters).toEqual([]);
    });
  });

  describe('adapter unregistration', () => {
    beforeEach(() => {
      registry.register(mockAdapter);
    });

    it('should unregister adapter by name and version', () => {
      const result = registry.unregister('mock-adapter', '1.0.0');
      
      expect(result).toBe(true);
      expect(registry.hasAdapter('mock-adapter', '1.0.0')).toBe(false);
      expect(registry.supportsType('mock')).toBe(false);
    });

    it('should unregister latest version when version not specified', () => {
      const adapter2 = new MockDatabaseAdapter('mock-adapter', '2.0.0');
      registry.register(adapter2);
      
      const result = registry.unregister('mock-adapter');
      
      expect(result).toBe(true);
      expect(registry.hasAdapter('mock-adapter', '2.0.0')).toBe(false);
      expect(registry.hasAdapter('mock-adapter', '1.0.0')).toBe(true);
    });

    it('should return false when unregistering non-existent adapter', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should update type mapping when unregistering last adapter of type', () => {
      registry.unregister('mock-adapter', '1.0.0');
      expect(registry.supportsType('mock')).toBe(false);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      registry.register(mockAdapter);
    });

    it('should check if adapter exists', () => {
      expect(registry.hasAdapter('mock-adapter', '1.0.0')).toBe(true);
      expect(registry.hasAdapter('mock-adapter')).toBe(true);
      expect(registry.hasAdapter('non-existent')).toBe(false);
    });

    it('should check if type is supported', () => {
      expect(registry.supportsType('mock')).toBe(true);
      expect(registry.supportsType('unsupported' as DatabaseType)).toBe(false);
    });

    it('should get supported database types', () => {
      const types = registry.getSupportedTypes();
      expect(types).toContain('mock');
    });

    it('should clear all adapters', () => {
      registry.clear();
      
      expect(registry.listAdapters()).toEqual([]);
      expect(registry.getSupportedTypes()).toEqual([]);
    });
  });

  describe('initialization and disposal', () => {
    beforeEach(() => {
      registry.register(mockAdapter);
    });

    it('should initialize all adapters', async () => {
      const configs = {
        'mock-adapter': { connection: { host: 'localhost' } }
      };

      await registry.initializeAll(configs);
      
      // Verify adapter was initialized (mock implementation)
      expect(mockAdapter.initialize).toHaveBeenCalledWith(configs['mock-adapter']);
    });

    it('should dispose all adapters', async () => {
      await registry.disposeAll();
      
      expect(mockAdapter.dispose).toHaveBeenCalled();
    });
  });

  describe('version comparison', () => {
    it('should handle semantic versioning correctly', () => {
      const adapter1 = new MockDatabaseAdapter('test', '1.0.0');
      const adapter2 = new MockDatabaseAdapter('test', '1.1.0');
      const adapter3 = new MockDatabaseAdapter('test', '2.0.0');
      
      registry.register(adapter1);
      registry.register(adapter2);
      registry.register(adapter3);
      
      const latest = registry.getAdapter('test');
      expect(latest?.version).toBe('2.0.0');
    });

    it('should handle different version formats', () => {
      const adapter1 = new MockDatabaseAdapter('test', '1.0');
      const adapter2 = new MockDatabaseAdapter('test', '1.0.1');
      
      registry.register(adapter1);
      registry.register(adapter2);
      
      const latest = registry.getAdapter('test');
      expect(latest?.version).toBe('1.0.1');
    });
  });
});

describe('AdapterPluginSystem', () => {
  let pluginSystem: AdapterPluginSystem;
  let mockRegistry: jest.Mocked<AdapterRegistry>;

  beforeEach(() => {
    mockRegistry = {
      register: jest.fn(),
      unregister: jest.fn(),
      getAdapter: jest.fn(),
      getAdapterByType: jest.fn(),
      listAdapters: jest.fn(),
      listAdaptersByType: jest.fn(),
      hasAdapter: jest.fn(),
      supportsType: jest.fn(),
      getSupportedTypes: jest.fn(),
      clear: jest.fn(),
      initializeAll: jest.fn(),
      disposeAll: jest.fn()
    } as any;

    pluginSystem = new AdapterPluginSystem(mockRegistry);
  });

  describe.skip('adapter loading', () => {
    it('should load adapter from module path', async () => {
      // Mock dynamic import
      const mockImport = jest.fn().mockResolvedValue({
        default: MockDatabaseAdapter
      });
      
      (global as any).import = mockImport as any;
      
      await pluginSystem.loadAdapter('./mock-adapter');
      
      expect(mockImport).toHaveBeenCalledWith('./mock-adapter');
      expect(mockRegistry.register).toHaveBeenCalled();
    });

    it('should handle module without default export', async () => {
      const mockImport = jest.fn().mockResolvedValue(MockDatabaseAdapter);
      (global as any).import = mockImport as any;
      
      await pluginSystem.loadAdapter('./mock-adapter');
      
      expect(mockRegistry.register).toHaveBeenCalled();
    });

    it('should throw error for invalid adapter module', async () => {
      const mockImport = jest.fn().mockResolvedValue({ default: 'not-an-adapter' });
      (global as any).import = mockImport as any;
      
      await expect(pluginSystem.loadAdapter('./invalid-adapter'))
        .rejects.toThrow('Invalid adapter module');
    });

    it('should throw error for invalid adapter implementation', async () => {
      const InvalidAdapter = function() {};
      const mockImport = jest.fn().mockResolvedValue({ default: InvalidAdapter });
      (global as any).import = mockImport as any;
      
      await expect(pluginSystem.loadAdapter('./invalid-adapter'))
        .rejects.toThrow('Invalid adapter implementation');
    });

    it('should handle import errors gracefully', async () => {
      const mockImport = jest.fn().mockRejectedValue(new Error('Module not found'));
      (global as any).import = mockImport as any;
      
      await expect(pluginSystem.loadAdapter('./non-existent'))
        .rejects.toThrow('Failed to load adapter');
    });
  });

  describe('adapter validation', () => {
    it('should validate adapter interface correctly', () => {
      const validAdapter = new MockDatabaseAdapter();
      const isValid = (pluginSystem as any).isValidAdapter(validAdapter);
      expect(isValid).toBe(true);
    });

    it('should reject invalid adapter objects', () => {
      const invalidAdapter = { name: 'test' };
      const isValid = (pluginSystem as any).isValidAdapter(invalidAdapter);
      expect(isValid).toBe(false);
    });

    it('should reject null or undefined adapters', () => {
      expect((pluginSystem as any).isValidAdapter(null)).toBe(false);
      expect((pluginSystem as any).isValidAdapter(undefined)).toBe(false);
    });
  });
});