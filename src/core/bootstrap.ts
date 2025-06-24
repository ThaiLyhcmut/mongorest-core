import { NewCore, CoreConfig } from './main/newCore';
import { AdapterPluginSystem, adapterRegistry } from './adapters/base/adapterRegistry';
import { MongoDBAdapter } from './adapters/mongodb/mongodbAdapter';
import { PostgreSQLAdapter } from './adapters/postgresql/postgresqlAdapter';
import { ElasticsearchAdapter } from './adapters/elasticsearch/elasticsearchAdapter';
import { MySQLAdapter } from './adapters/mysql/mysqlAdapter';
import { RelationshipRegistry } from './adapters/base/relationship/RelationshipRegistry';
import { BootstrapErrors } from './errors/errorFactories';
import { wrapError, ErrorCodes } from './errors';

/**
 * Bootstrap the new core system with all database adapters
 */
export class CoreBootstrap {
  private core?: NewCore;
  private pluginSystem: AdapterPluginSystem;
  private relationshipRegistry: RelationshipRegistry;

  constructor() {
    this.pluginSystem = new AdapterPluginSystem(adapterRegistry);
    this.relationshipRegistry = new RelationshipRegistry();
  }

  /**
   * Initialize the core system with built-in adapters
   */
  async initializeWithBuiltinAdapters(config?: CoreConfig): Promise<NewCore> {
    try {
      // Register built-in adapters
      await this.registerBuiltinAdapters();

      // Create core instance
      this.core = new NewCore(this.relationshipRegistry, adapterRegistry);

      // Initialize with configuration
      if (config) {
        await this.core.initialize(config);
      }

      return this.core;
    } catch (error) {
      throw BootstrapErrors.initBuiltinFailed(error);
    }
  }

  /**
   * Initialize the core system with custom configuration
   */
  async initializeWithConfig(config: BootstrapConfig): Promise<NewCore> {
    if (!config) {
      throw BootstrapErrors.configRequired();
    }
    
    try {
      // Register built-in adapters if requested
      if (config.includeBuiltinAdapters !== false) {
        await this.registerBuiltinAdapters();
      }

      // Load custom adapters
      if (config.customAdapters) {
        await this.loadCustomAdapters(config.customAdapters);
      }

      // Setup relationships
      if (config.relationships) {
        this.relationshipRegistry.registerBulk(config.relationships);
      } else if (config.includeBuiltinAdapters !== false) {
        // Only throw if we're expecting relationships
        console.warn("No relationships defined in configuration");
      }

      // Create core instance
      this.core = new NewCore(this.relationshipRegistry, adapterRegistry);

      // Initialize with core configuration
      if (config.core) {
        await this.core.initialize(config.core);
      }

      return this.core;
    } catch (error) {
      throw BootstrapErrors.initConfigFailed(error);
    }
  }

  /**
   * Get the initialized core instance
   */
  getCore(): NewCore {
    if (!this.core) {
      throw BootstrapErrors.coreNotInitialized();
    }
    return this.core;
  }

  /**
   * Register all built-in database adapters
   */
  private async registerBuiltinAdapters(): Promise<void> {
    try {
      // Register MongoDB adapter
      const mongoAdapter = new MongoDBAdapter(this.relationshipRegistry);
      adapterRegistry.register(mongoAdapter);
      console.log('✅ MongoDB adapter registered');

      // Register PostgreSQL adapter
      const postgresAdapter = new PostgreSQLAdapter();
      adapterRegistry.register(postgresAdapter);
      console.log('✅ PostgreSQL adapter registered');

      // Register Elasticsearch adapter
      const elasticsearchAdapter = new ElasticsearchAdapter();
      adapterRegistry.register(elasticsearchAdapter);
      console.log('✅ Elasticsearch adapter registered');

      // Register MySQL adapter
      const mysqlAdapter = new MySQLAdapter();
      adapterRegistry.register(mysqlAdapter);
      console.log('✅ MySQL adapter registered');

    } catch (error) {
      console.error('❌ Failed to register built-in adapters:', error);
      throw wrapError(error, ErrorCodes.BST_INIT_BUILTIN_FAILED);
    }
  }

  /**
   * Load custom adapters from configuration
   */
  private async loadCustomAdapters(customAdapters: CustomAdapterConfig[]): Promise<void> {
    for (const adapterConfig of customAdapters) {
      try {
        if (adapterConfig.path) {
          await this.pluginSystem.loadAdapter(adapterConfig.path);
          console.log(`✅ Custom adapter loaded from: ${adapterConfig.path}`);
        } else if (adapterConfig.instance) {
          adapterRegistry.register(adapterConfig.instance);
          console.log(`✅ Custom adapter instance registered: ${adapterConfig.instance.name}`);
        }
      } catch (error) {
        if (adapterConfig.required) {
          throw wrapError(error, ErrorCodes.ADP_LOAD_FAILED);
        }
        console.warn(`⚠️ Optional custom adapter failed to load:`, error);
      }
    }
  }

  /**
   * Setup default relationship definitions
   */
  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    const adapters = adapterRegistry.listAdapters();
    const relationships = this.relationshipRegistry.listAllRelationships();

    return {
      initialized: !!this.core,
      adapters: adapters.map(adapter => ({
        name: adapter.name,
        type: adapter.type,
        version: adapter.version,
        capabilities: adapter.capabilities
      })),
      relationships: Object.keys(relationships),
      supportedDatabaseTypes: adapterRegistry.getSupportedTypes()
    };
  }

  /**
   * Test all adapter connections
   */
  async testConnections(): Promise<ConnectionTestResult[]> {
    try {
      const adapters = adapterRegistry.listAdapters();
      
      if (!Array.isArray(adapters)) {
        throw BootstrapErrors.adapterListFailed();
      }
      
      const results: ConnectionTestResult[] = [];

      for (const adapterInfo of adapters) {
        try {
          const adapter = adapterRegistry.getAdapter(adapterInfo.name, adapterInfo.version);
          if (adapter) {
            const connected = await adapter.testConnection();
            results.push({
              adapter: adapterInfo.name,
              type: adapterInfo.type,
              connected,
              error: connected ? undefined : 'Connection test failed'
            });
          } else {
            results.push({
              adapter: adapterInfo.name,
              type: adapterInfo.type,
              connected: false,
              error: 'Adapter not found'
            });
          }
        } catch (error) {
          results.push({
            adapter: adapterInfo.name,
            type: adapterInfo.type,
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      throw BootstrapErrors.testConnectionFailed(error);
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.core) {
      await this.core.dispose();
    }
    await adapterRegistry.disposeAll();
  }
}

/**
 * Bootstrap configuration interface
 */
export interface BootstrapConfig {
  /** Whether to include built-in adapters (default: true) */
  includeBuiltinAdapters?: boolean;

  /** Custom adapter configurations */
  customAdapters?: CustomAdapterConfig[];

  /** Relationship definitions */
  relationships?: Record<string, any>;

  /** Core configuration */
  core?: CoreConfig;
}

export interface CustomAdapterConfig {
  /** Path to adapter module */
  path?: string;

  /** Adapter instance */
  instance?: any;

  /** Whether this adapter is required */
  required?: boolean;
}

export interface SystemStatus {
  initialized: boolean;
  adapters: {
    name: string;
    type: string;
    version: string;
    capabilities: any;
  }[];
  relationships: string[];
  supportedDatabaseTypes: string[];
}

export interface ConnectionTestResult {
  adapter: string;
  type: string;
  connected: boolean;
  error?: string;
}

/**
 * Factory function for easy initialization
 */
export async function createCoreSystem(config?: BootstrapConfig): Promise<NewCore> {
  const bootstrap = new CoreBootstrap();
  
  if (config) {
    return bootstrap.initializeWithConfig(config);
  } else {
    return bootstrap.initializeWithBuiltinAdapters();
  }
}

/**
 * Quick start function with minimal configuration
 */
export async function quickStart(databaseConfigs?: Record<string, any>): Promise<NewCore> {
  const coreConfig: CoreConfig = {
    adapters: databaseConfigs || {}
  };

  return createCoreSystem({
    core: coreConfig
  });
}

// Export singleton bootstrap instance
export const coreBootstrap = new CoreBootstrap();