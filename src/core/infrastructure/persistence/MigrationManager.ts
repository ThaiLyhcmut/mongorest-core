/**
 * Database migration management system
 */
import { IMigration, IMigrationManager, IMigrationStatus } from '../../shared/contracts';
import { DatabaseAdapter } from '../../adapters/base/databaseAdapter';
import { Logger } from '../logging/Logger';

export abstract class BaseMigration implements IMigration {
  constructor(
    public version: string,
    public name: string
  ) {}

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;
}

export class MigrationManager implements IMigrationManager {
  private migrations: Map<string, IMigration> = new Map();
  private migrationTable = '_migrations';
  
  constructor(
    private adapter: DatabaseAdapter,
    private logger?: Logger
  ) {}

  /**
   * Register a migration
   */
  public register(migration: IMigration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration ${migration.version} already registered`);
    }
    
    this.migrations.set(migration.version, migration);
    
    if (this.logger) {
      this.logger.debug(`Registered migration: ${migration.version} - ${migration.name}`);
    }
  }

  /**
   * Register multiple migrations
   */
  public registerAll(migrations: IMigration[]): void {
    for (const migration of migrations) {
      this.register(migration);
    }
  }

  /**
   * Run pending migrations
   */
  public async migrate(): Promise<void> {
    await this.ensureMigrationTable();
    
    const applied = await this.getAppliedMigrations();
    const pending = this.getPendingMigrations(applied);
    
    if (pending.length === 0) {
      if (this.logger) {
        this.logger.info('No pending migrations');
      }
      return;
    }

    if (this.logger) {
      this.logger.info(`Running ${pending.length} pending migrations`);
    }

    for (const migration of pending) {
      await this.runMigration(migration);
    }

    if (this.logger) {
      this.logger.info('All migrations completed successfully');
    }
  }

  /**
   * Rollback migrations
   */
  public async rollback(steps: number = 1): Promise<void> {
    const applied = await this.getAppliedMigrations();
    
    if (applied.length === 0) {
      if (this.logger) {
        this.logger.info('No migrations to rollback');
      }
      return;
    }

    const toRollback = applied
      .sort((a, b) => b.version.localeCompare(a.version))
      .slice(0, steps);

    if (this.logger) {
      this.logger.info(`Rolling back ${toRollback.length} migrations`);
    }

    for (const record of toRollback) {
      const migration = this.migrations.get(record.version);
      
      if (!migration) {
        throw new Error(`Migration ${record.version} not found in registry`);
      }

      await this.rollbackMigration(migration);
    }

    if (this.logger) {
      this.logger.info('Rollback completed successfully');
    }
  }

  /**
   * Get migration status
   */
  public async status(): Promise<IMigrationStatus[]> {
    await this.ensureMigrationTable();
    
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(a => a.version));
    
    const statuses: IMigrationStatus[] = [];
    
    // Get all migrations sorted by version
    const allMigrations = Array.from(this.migrations.values())
      .sort((a, b) => a.version.localeCompare(b.version));
    
    for (const migration of allMigrations) {
      const appliedRecord = applied.find(a => a.version === migration.version);
      
      statuses.push({
        version: migration.version,
        name: migration.name,
        appliedAt: appliedRecord?.appliedAt,
        status: appliedRecord ? 'applied' : 'pending'
      });
    }
    
    return statuses;
  }

  /**
   * Reset all migrations
   */
  public async reset(): Promise<void> {
    const applied = await this.getAppliedMigrations();
    
    if (applied.length === 0) {
      return;
    }

    if (this.logger) {
      this.logger.warn(`Resetting ${applied.length} migrations`);
    }

    // Rollback all in reverse order
    await this.rollback(applied.length);
  }

  /**
   * Refresh migrations (reset and re-run)
   */
  public async refresh(): Promise<void> {
    await this.reset();
    await this.migrate();
  }

  private async ensureMigrationTable(): Promise<void> {
    // Check if migration table exists
    let collections: string[] = [];
    
    if ('listCollections' in this.adapter && this.adapter.listCollections) {
      collections = await (this.adapter.listCollections as any)();
    }
    
    if (!collections.includes(this.migrationTable)) {
      // Create migration table
      if ('createCollection' in this.adapter && this.adapter.createCollection) {
        await (this.adapter.createCollection as any)(this.migrationTable);
      }
      
      // Create index on version
      if ('createIndex' in this.adapter && this.adapter.createIndex) {
        await (this.adapter.createIndex as any)(this.migrationTable, { version: 1 }, { unique: true });
      }
      
      if (this.logger) {
        this.logger.debug('Created migration table');
      }
    }
  }

  private async getAppliedMigrations(): Promise<AppliedMigration[]> {
    let records: any[] = [];
    
    if ('find' in this.adapter && this.adapter.find) {
      records = await (this.adapter.find as any)(this.migrationTable, {
        sort: { version: 1 }
      });
    } else {
      // Fallback for legacy adapters
      const intermediateQuery = {
        collection: this.migrationTable,
        operation: 'find',
        sort: { version: 1 }
      };
      const nativeQuery = this.adapter.convertQuery(intermediateQuery as any);
      const result = await this.adapter.executeQuery(nativeQuery);
      records = result.data || [];
    }
    
    return records.map(r => ({
      version: r.version,
      name: r.name,
      appliedAt: new Date(r.appliedAt)
    }));
  }

  private getPendingMigrations(applied: AppliedMigration[]): IMigration[] {
    const appliedVersions = new Set(applied.map(a => a.version));
    
    return Array.from(this.migrations.values())
      .filter(m => !appliedVersions.has(m.version))
      .sort((a, b) => a.version.localeCompare(b.version));
  }

  private async runMigration(migration: IMigration): Promise<void> {
    const startTime = Date.now();
    
    if (this.logger) {
      this.logger.info(`Running migration: ${migration.version} - ${migration.name}`);
    }

    try {
      // Begin transaction if supported
      let supportsTransactions = false;
      if ('supportsTransactions' in this.adapter && this.adapter.supportsTransactions) {
        supportsTransactions = await (this.adapter.supportsTransactions as any)();
      }
      
      if (supportsTransactions && 'beginTransaction' in this.adapter && this.adapter.beginTransaction) {
        await (this.adapter.beginTransaction as any)();
      }

      // Run migration
      await migration.up();

      // Record migration
      if ('create' in this.adapter && this.adapter.create) {
        await (this.adapter.create as any)(this.migrationTable, {
          version: migration.version,
          name: migration.name,
          appliedAt: new Date(),
          duration: Date.now() - startTime
        });
      }

      if (supportsTransactions && 'commitTransaction' in this.adapter && this.adapter.commitTransaction) {
        await (this.adapter.commitTransaction as any)();
      }

      if (this.logger) {
        const duration = Date.now() - startTime;
        this.logger.info(`Migration completed: ${migration.version} (${duration}ms)`);
      }
    } catch (error) {
      if ('supportsTransactions' in this.adapter && this.adapter.supportsTransactions && await (this.adapter.supportsTransactions as any)() && 'rollbackTransaction' in this.adapter && this.adapter.rollbackTransaction) {
        await (this.adapter.rollbackTransaction as any)();
      }

      if (this.logger) {
        this.logger.error(`Migration failed: ${migration.version}`, error as Error);
      }

      throw error;
    }
  }

  private async rollbackMigration(migration: IMigration): Promise<void> {
    const startTime = Date.now();
    
    if (this.logger) {
      this.logger.info(`Rolling back migration: ${migration.version} - ${migration.name}`);
    }

    try {
      // Begin transaction if supported
      let supportsTransactions = false;
      if ('supportsTransactions' in this.adapter && this.adapter.supportsTransactions) {
        supportsTransactions = await (this.adapter.supportsTransactions as any)();
      }
      
      if (supportsTransactions && 'beginTransaction' in this.adapter && this.adapter.beginTransaction) {
        await (this.adapter.beginTransaction as any)();
      }

      // Run rollback
      await migration.down();

      // Remove migration record
      if ('delete' in this.adapter && this.adapter.delete) {
        await (this.adapter.delete as any)(this.migrationTable, { version: migration.version });
      }

      if (supportsTransactions && 'commitTransaction' in this.adapter && this.adapter.commitTransaction) {
        await (this.adapter.commitTransaction as any)();
      }

      if (this.logger) {
        const duration = Date.now() - startTime;
        this.logger.info(`Rollback completed: ${migration.version} (${duration}ms)`);
      }
    } catch (error) {
      if ('supportsTransactions' in this.adapter && this.adapter.supportsTransactions && await (this.adapter.supportsTransactions as any)() && 'rollbackTransaction' in this.adapter && this.adapter.rollbackTransaction) {
        await (this.adapter.rollbackTransaction as any)();
      }

      if (this.logger) {
        this.logger.error(`Rollback failed: ${migration.version}`, error as Error);
      }

      throw error;
    }
  }
}

interface AppliedMigration {
  version: string;
  name: string;
  appliedAt: Date;
}

/**
 * Example migration
 */
export class ExampleMigration extends BaseMigration {
  constructor() {
    super('2024.01.01.001', 'create_users_table');
  }

  async up(): Promise<void> {
    // Create users collection with indexes
    await this.createUsersCollection();
  }

  async down(): Promise<void> {
    // Drop users collection
    await this.dropUsersCollection();
  }

  private async createUsersCollection(): Promise<void> {
    // Implementation
  }

  private async dropUsersCollection(): Promise<void> {
    // Implementation
  }
}

/**
 * Migration loader from directory
 */
export class MigrationLoader {
  static async loadFromDirectory(directory: string): Promise<IMigration[]> {
    const migrations: IMigration[] = [];
    
    // In real implementation, use fs to read directory
    // and dynamically import migration files
    
    return migrations;
  }
}