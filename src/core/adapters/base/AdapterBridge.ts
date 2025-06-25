/**
 * Bridge to adapt legacy database adapters to new interface
 */
import { DatabaseAdapter } from './databaseAdapter';
import { IntermediateQuery } from '../../types/intermediateQuery';

export class AdapterBridge implements DatabaseAdapter {
  public readonly name: string;
  public readonly type: any;
  public readonly version: string;

  constructor(private legacyAdapter: any) {
    this.name = legacyAdapter.name || 'unknown';
    this.type = legacyAdapter.type || 'generic';
    this.version = legacyAdapter.version || '1.0.0';
  }

  // Legacy methods
  convertQuery(query: IntermediateQuery): any {
    return this.legacyAdapter.convertQuery?.(query) || query;
  }

  async executeQuery<T = any>(nativeQuery: any, options?: any): Promise<any> {
    return this.legacyAdapter.executeQuery?.(nativeQuery, options);
  }

  validateQuery(query: IntermediateQuery): any {
    return this.legacyAdapter.validateQuery?.(query) || { isValid: true };
  }

  getCapabilities(): any {
    return this.legacyAdapter.getCapabilities?.() || {};
  }

  async initialize(config: any): Promise<void> {
    if (this.legacyAdapter.initialize) {
      await this.legacyAdapter.initialize(config);
    }
  }

  async dispose(): Promise<void> {
    if (this.legacyAdapter.dispose) {
      await this.legacyAdapter.dispose();
    }
  }

  // New interface methods with fallbacks
  async find<T = any>(collection: string, query: any): Promise<T[]> {
    if (this.legacyAdapter.find) {
      return this.legacyAdapter.find(collection, query);
    }
    
    // Fallback using executeQuery
    const intermediateQuery: IntermediateQuery = {
      collection,
      operation: 'find',
      filter: query.filter || {},
      options: query
    };
    
    const nativeQuery = this.convertQuery(intermediateQuery);
    const result = await this.executeQuery(nativeQuery);
    return result.data || [];
  }

  async create<T = any>(collection: string, data: any): Promise<T> {
    if (this.legacyAdapter.create) {
      return this.legacyAdapter.create(collection, data);
    }
    
    const intermediateQuery: IntermediateQuery = {
      collection,
      operation: 'create',
      data
    };
    
    const nativeQuery = this.convertQuery(intermediateQuery);
    const result = await this.executeQuery(nativeQuery);
    return result.data;
  }

  async update<T = any>(collection: string, filter: any, data: any): Promise<T> {
    if (this.legacyAdapter.update) {
      return this.legacyAdapter.update(collection, filter, data);
    }
    
    const intermediateQuery: IntermediateQuery = {
      collection,
      operation: 'update',
      filter,
      data
    };
    
    const nativeQuery = this.convertQuery(intermediateQuery);
    const result = await this.executeQuery(nativeQuery);
    return result.data;
  }

  async delete(collection: string, filter: any): Promise<{ deletedCount: number }> {
    if (this.legacyAdapter.delete) {
      return this.legacyAdapter.delete(collection, filter);
    }
    
    const intermediateQuery: IntermediateQuery = {
      collection,
      operation: 'delete',
      filter
    };
    
    const nativeQuery = this.convertQuery(intermediateQuery);
    const result = await this.executeQuery(nativeQuery);
    return { deletedCount: result.deletedCount || 0 };
  }

  // Transaction support
  async beginTransaction(): Promise<void> {
    if (this.legacyAdapter.beginTransaction) {
      await this.legacyAdapter.beginTransaction();
    }
  }

  async commitTransaction(): Promise<void> {
    if (this.legacyAdapter.commitTransaction) {
      await this.legacyAdapter.commitTransaction();
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.legacyAdapter.rollbackTransaction) {
      await this.legacyAdapter.rollbackTransaction();
    }
  }

  async supportsTransactions(): Promise<boolean> {
    if (this.legacyAdapter.supportsTransactions) {
      return this.legacyAdapter.supportsTransactions();
    }
    return false;
  }

  // Collection management
  async listCollections(): Promise<string[]> {
    if (this.legacyAdapter.listCollections) {
      return this.legacyAdapter.listCollections();
    }
    return [];
  }

  async createCollection(name: string): Promise<void> {
    if (this.legacyAdapter.createCollection) {
      await this.legacyAdapter.createCollection(name);
    }
  }

  async createIndex(collection: string, spec: any, options?: any): Promise<void> {
    if (this.legacyAdapter.createIndex) {
      await this.legacyAdapter.createIndex(collection, spec, options);
    }
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.legacyAdapter.connect) {
      await this.legacyAdapter.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.legacyAdapter.disconnect) {
      await this.legacyAdapter.disconnect();
    }
  }

  isConnected(): boolean {
    if (this.legacyAdapter.isConnected) {
      return this.legacyAdapter.isConnected();
    }
    return true; // Assume connected if no method available
  }

  // Required method from interface
  async testConnection(): Promise<boolean> {
    if (this.legacyAdapter.testConnection) {
      return this.legacyAdapter.testConnection();
    }
    return this.isConnected();
  }
}