import { DatabaseAdapter, DatabaseType } from './databaseAdapter';
import { AdapterErrors } from '../../errors/errorFactories';

/**
 * Registry for managing database adapters
 */
export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters = new Map<string, DatabaseAdapter>();
  private typeMap = new Map<DatabaseType, string[]>();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  /**
   * Register a database adapter
   */
  register(adapter: DatabaseAdapter): void {
    const key = this.createAdapterKey(adapter.name, adapter.version);
    
    if (this.adapters.has(key)) {
      console.warn(`Adapter ${key} is already registered, skipping...`);
      return;
    }

    this.adapters.set(key, adapter);
    
    // Update type mapping
    const typeAdapters = this.typeMap.get(adapter.type) || [];
    typeAdapters.push(key);
    this.typeMap.set(adapter.type, typeAdapters);
  }

  /**
   * Unregister an adapter
   */
  unregister(name: string, version?: string): boolean {
    const key = version ? this.createAdapterKey(name, version) : this.findLatestVersion(name);
    
    if (!key || !this.adapters.has(key)) {
      return false;
    }

    const adapter = this.adapters.get(key)!;
    this.adapters.delete(key);
    
    // Update type mapping
    const typeAdapters = this.typeMap.get(adapter.type) || [];
    const index = typeAdapters.indexOf(key);
    if (index > -1) {
      typeAdapters.splice(index, 1);
      if (typeAdapters.length === 0) {
        this.typeMap.delete(adapter.type);
      } else {
        this.typeMap.set(adapter.type, typeAdapters);
      }
    }

    return true;
  }

  /**
   * Get adapter by name and version
   */
  getAdapter(name: string, version?: string): DatabaseAdapter | null {
    const key = version ? this.createAdapterKey(name, version) : this.findLatestVersion(name);
    return key ? this.adapters.get(key) || null : null;
  }

  /**
   * Get adapter by database type
   */
  getAdapterByType(type: DatabaseType, preferredName?: string): DatabaseAdapter | null {
    const adapters = this.typeMap.get(type) || [];
    
    if (adapters.length === 0) {
      return null;
    }

    // If preferred name is specified, try to find it first
    if (preferredName) {
      const preferred = adapters.find(key => key.startsWith(`${preferredName}@`));
      if (preferred) {
        return this.adapters.get(preferred) || null;
      }
    }

    // Return the first available adapter (or latest version)
    const latestKey = this.findLatestVersionForType(type);
    return latestKey ? this.adapters.get(latestKey) || null : null;
  }

  /**
   * List all registered adapters
   */
  listAdapters(): AdapterInfo[] {
    return Array.from(this.adapters.entries()).map(([key, adapter]) => ({
      key,
      name: adapter.name,
      type: adapter.type,
      version: adapter.version,
      capabilities: adapter.getCapabilities()
    }));
  }

  /**
   * List adapters by type
   */
  listAdaptersByType(type: DatabaseType): AdapterInfo[] {
    const adapters = this.typeMap.get(type) || [];
    return adapters.map(key => {
      const adapter = this.adapters.get(key)!;
      return {
        key,
        name: adapter.name,
        type: adapter.type,
        version: adapter.version,
        capabilities: adapter.getCapabilities()
      };
    });
  }

  /**
   * Check if adapter exists
   */
  hasAdapter(name: string, version?: string): boolean {
    const key = version ? this.createAdapterKey(name, version) : this.findLatestVersion(name);
    return key ? this.adapters.has(key) : false;
  }

  /**
   * Check if type is supported
   */
  supportsType(type: DatabaseType): boolean {
    return this.typeMap.has(type);
  }

  /**
   * Get supported database types
   */
  getSupportedTypes(): DatabaseType[] {
    return Array.from(this.typeMap.keys());
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
    this.typeMap.clear();
  }

  /**
   * Initialize all registered adapters
   */
  async initializeAll(configs: Record<string, any>): Promise<void> {
    const promises = Array.from(this.adapters.entries()).map(async ([key, adapter]) => {
      const config = configs[adapter.name] || configs[key];
      if (config) {
        await adapter.initialize(config);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Dispose all registered adapters
   */
  async disposeAll(): Promise<void> {
    const promises = Array.from(this.adapters.values()).map(adapter => 
      adapter.dispose()
    );

    await Promise.all(promises);
  }

  private createAdapterKey(name: string, version: string): string {
    return `${name}@${version}`;
  }

  private findLatestVersion(name: string): string | null {
    const keys = Array.from(this.adapters.keys()).filter(key => 
      key.startsWith(`${name}@`)
    );

    if (keys.length === 0) {
      return null;
    }

    // Simple version comparison - assumes semantic versioning
    return keys.sort((a, b) => {
      const versionA = a.split('@')[1];
      const versionB = b.split('@')[1];
      return this.compareVersions(versionB, versionA); // Descending order
    })[0];
  }

  private findLatestVersionForType(type: DatabaseType): string | null {
    const adapters = this.typeMap.get(type) || [];
    
    if (adapters.length === 0) {
      return null;
    }

    // Return the latest version across all adapters of this type
    return adapters.sort((a, b) => {
      const versionA = a.split('@')[1];
      const versionB = b.split('@')[1];
      return this.compareVersions(versionB, versionA); // Descending order
    })[0];
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    
    return 0;
  }
}

export interface AdapterInfo {
  key: string;
  name: string;
  type: DatabaseType;
  version: string;
  capabilities: any;
}

/**
 * Plugin system for dynamically loading adapters
 */
export class AdapterPluginSystem {
  private registry: AdapterRegistry;

  constructor(registry?: AdapterRegistry) {
    this.registry = registry || AdapterRegistry.getInstance();
  }

  /**
   * Load adapter from module
   */
  async loadAdapter(modulePath: string): Promise<void> {
    try {
      const module = await import(modulePath);
      const AdapterClass = module.default || module;
      
      if (typeof AdapterClass !== 'function') {
        throw AdapterErrors.moduleInvalid(modulePath);
      }

      const adapter = new AdapterClass();
      
      if (!this.isValidAdapter(adapter)) {
        throw AdapterErrors.implementationInvalid(modulePath);
      }

      this.registry.register(adapter);
    } catch (error) {
      throw AdapterErrors.loadFailed(modulePath, (error as Error).message);
    }
  }

  /**
   * Load multiple adapters from directory
   */
  async loadAdaptersFromDirectory(directory: string): Promise<string[]> {
    const fs = await import('fs');
    const path = await import('path');
    
    const files = fs.readdirSync(directory);
    const loaded: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        try {
          const modulePath = path.join(directory, file);
          await this.loadAdapter(modulePath);
          loaded.push(file);
        } catch (error) {
          console.warn(`Failed to load adapter from ${file}:`, error);
        }
      }
    }
    
    return loaded;
  }

  /**
   * Load adapters from configuration
   */
  async loadAdaptersFromConfig(config: AdapterPluginConfig): Promise<void> {
    for (const adapterConfig of config.adapters) {
      try {
        if (adapterConfig.path) {
          await this.loadAdapter(adapterConfig.path);
        } else if (adapterConfig.package) {
          await this.loadAdapter(adapterConfig.package);
        }
      } catch (error) {
        if (adapterConfig.required) {
          throw error;
        }
        console.warn(`Optional adapter failed to load:`, error);
      }
    }
  }

  private isValidAdapter(obj: any): obj is DatabaseAdapter {
    return !!(obj &&
           typeof obj.name === 'string' &&
           typeof obj.type === 'string' &&
           typeof obj.version === 'string' &&
           typeof obj.convertQuery === 'function' &&
           typeof obj.executeQuery === 'function' &&
           typeof obj.validateQuery === 'function' &&
           typeof obj.getCapabilities === 'function' &&
           typeof obj.initialize === 'function' &&
           typeof obj.dispose === 'function' &&
           typeof obj.testConnection === 'function');
  }
}

export interface AdapterPluginConfig {
  adapters: {
    path?: string;
    package?: string;
    required?: boolean;
    config?: any;
  }[];
}

// Export singleton instance
export const adapterRegistry = AdapterRegistry.getInstance();