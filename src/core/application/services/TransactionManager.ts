/**
 * Transaction management for cross-adapter transactions
 */
import { ITransaction, IUnitOfWork } from '../../shared/contracts';
import { DatabaseAdapter } from '../../adapters/base/databaseAdapter';
import { EventEmitter } from 'events';

/**
 * Transaction implementation
 */
export class Transaction implements ITransaction {
  private _isActive = false;
  private _isCommitted = false;
  private _isRolledBack = false;
  private operations: Array<() => Promise<void>> = [];
  private rollbackHandlers: Array<() => Promise<void>> = [];

  constructor(
    private id: string,
    private adapter: DatabaseAdapter,
    private eventEmitter: EventEmitter
  ) {}

  public async begin(): Promise<void> {
    if (this._isActive) {
      throw new Error('Transaction already active');
    }

    if ('beginTransaction' in this.adapter && this.adapter.beginTransaction) {
      await (this.adapter.beginTransaction as any)();
    }
    this._isActive = true;
    
    this.eventEmitter.emit('transaction:begin', { id: this.id });
  }

  public async commit(): Promise<void> {
    if (!this._isActive) {
      throw new Error('Transaction not active');
    }

    if (this._isCommitted || this._isRolledBack) {
      throw new Error('Transaction already completed');
    }

    try {
      // Execute all operations
      for (const operation of this.operations) {
        await operation();
      }

      if ('commitTransaction' in this.adapter && this.adapter.commitTransaction) {
        await (this.adapter.commitTransaction as any)();
      }
      this._isCommitted = true;
      this._isActive = false;
      
      this.eventEmitter.emit('transaction:commit', { id: this.id });
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    if (!this._isActive) {
      throw new Error('Transaction not active');
    }

    if (this._isCommitted || this._isRolledBack) {
      throw new Error('Transaction already completed');
    }

    try {
      // Execute rollback handlers in reverse order
      for (let i = this.rollbackHandlers.length - 1; i >= 0; i--) {
        await this.rollbackHandlers[i]();
      }

      if ('rollbackTransaction' in this.adapter && this.adapter.rollbackTransaction) {
        await (this.adapter.rollbackTransaction as any)();
      }
    } finally {
      this._isRolledBack = true;
      this._isActive = false;
      
      this.eventEmitter.emit('transaction:rollback', { id: this.id });
    }
  }

  public isActive(): boolean {
    return this._isActive;
  }

  public getId(): string {
    return this.id;
  }

  /**
   * Add operation to transaction
   */
  public addOperation(
    operation: () => Promise<void>,
    rollbackHandler?: () => Promise<void>
  ): void {
    if (!this._isActive) {
      throw new Error('Transaction not active');
    }

    this.operations.push(operation);
    
    if (rollbackHandler) {
      this.rollbackHandlers.push(rollbackHandler);
    }
  }
}

/**
 * Unit of Work implementation
 */
export class UnitOfWork implements IUnitOfWork {
  private transactions: Map<string, Transaction> = new Map();
  private eventEmitter = new EventEmitter();
  private isCompleted = false;

  constructor(private adapters: Map<string, DatabaseAdapter>) {}

  public async begin(): Promise<ITransaction> {
    if (this.isCompleted) {
      throw new Error('Unit of work already completed');
    }

    const id = this.generateTransactionId();
    
    // For now, use the first adapter
    const adapter = this.adapters.values().next().value;
    if (!adapter) {
      throw new Error('No adapters available');
    }

    const transaction = new Transaction(id, adapter, this.eventEmitter);
    await transaction.begin();
    
    this.transactions.set(id, transaction);
    
    return transaction;
  }

  public async complete(): Promise<void> {
    if (this.isCompleted) {
      throw new Error('Unit of work already completed');
    }

    try {
      // Commit all transactions
      for (const transaction of this.transactions.values()) {
        if (transaction.isActive()) {
          await transaction.commit();
        }
      }
      
      this.isCompleted = true;
      this.eventEmitter.emit('uow:complete');
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    // Rollback all active transactions
    const rollbackPromises: Promise<void>[] = [];
    
    for (const transaction of this.transactions.values()) {
      if (transaction.isActive()) {
        rollbackPromises.push(transaction.rollback());
      }
    }
    
    await Promise.all(rollbackPromises);
    this.isCompleted = true;
    
    this.eventEmitter.emit('uow:rollback');
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Event handling
   */
  public on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Transaction manager for coordinating distributed transactions
 */
export class TransactionManager {
  private activeUnitsOfWork: Map<string, UnitOfWork> = new Map();
  private transactionLog: TransactionLogEntry[] = [];
  private eventEmitter = new EventEmitter();

  constructor(private adapters: Map<string, DatabaseAdapter>) {}

  /**
   * Create a new unit of work
   */
  public createUnitOfWork(): UnitOfWork {
    const id = this.generateUnitOfWorkId();
    const uow = new UnitOfWork(this.adapters);
    
    // Subscribe to UoW events
    uow.on('uow:complete', () => this.onUnitOfWorkComplete(id));
    uow.on('uow:rollback', () => this.onUnitOfWorkRollback(id));
    
    this.activeUnitsOfWork.set(id, uow);
    
    return uow;
  }

  /**
   * Execute in transaction
   */
  public async executeInTransaction<T>(
    adapterName: string,
    operation: (transaction: ITransaction) => Promise<T>
  ): Promise<T> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }

    const uow = this.createUnitOfWork();
    const transaction = await uow.begin();

    try {
      const result = await operation(transaction);
      await uow.complete();
      return result;
    } catch (error) {
      await uow.rollback();
      throw error;
    }
  }

  /**
   * Execute distributed transaction across multiple adapters
   */
  public async executeDistributed<T>(
    operations: Array<{
      adapter: string;
      operation: (transaction: ITransaction) => Promise<any>;
    }>
  ): Promise<T[]> {
    const uow = this.createUnitOfWork();
    const results: T[] = [];

    try {
      for (const { adapter, operation } of operations) {
        const adapterInstance = this.adapters.get(adapter);
        if (!adapterInstance) {
          throw new Error(`Adapter ${adapter} not found`);
        }

        const transaction = await uow.begin();
        const result = await operation(transaction);
        results.push(result);
      }

      await uow.complete();
      return results;
    } catch (error) {
      await uow.rollback();
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  public getStatistics(): TransactionStatistics {
    const stats: TransactionStatistics = {
      activeTransactions: this.activeUnitsOfWork.size,
      totalTransactions: this.transactionLog.length,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageDuration: 0
    };

    let totalDuration = 0;
    
    for (const entry of this.transactionLog) {
      if (entry.status === 'committed') {
        stats.successfulTransactions++;
      } else if (entry.status === 'rolled_back') {
        stats.failedTransactions++;
      }
      
      if (entry.duration) {
        totalDuration += entry.duration;
      }
    }

    if (this.transactionLog.length > 0) {
      stats.averageDuration = totalDuration / this.transactionLog.length;
    }

    return stats;
  }

  /**
   * Clean up completed transactions
   */
  public cleanup(olderThan: Date): number {
    const cutoff = olderThan.getTime();
    const initialLength = this.transactionLog.length;
    
    this.transactionLog = this.transactionLog.filter(
      entry => entry.timestamp.getTime() > cutoff
    );
    
    return initialLength - this.transactionLog.length;
  }

  private onUnitOfWorkComplete(id: string): void {
    const uow = this.activeUnitsOfWork.get(id);
    if (uow) {
      this.activeUnitsOfWork.delete(id);
      this.logTransaction(id, 'committed');
    }
  }

  private onUnitOfWorkRollback(id: string): void {
    const uow = this.activeUnitsOfWork.get(id);
    if (uow) {
      this.activeUnitsOfWork.delete(id);
      this.logTransaction(id, 'rolled_back');
    }
  }

  private logTransaction(
    id: string,
    status: 'committed' | 'rolled_back'
  ): void {
    const entry: TransactionLogEntry = {
      id,
      status,
      timestamp: new Date()
    };
    
    this.transactionLog.push(entry);
    
    // Keep only last 10000 entries
    if (this.transactionLog.length > 10000) {
      this.transactionLog = this.transactionLog.slice(-10000);
    }
  }

  private generateUnitOfWorkId(): string {
    return `uow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface TransactionLogEntry {
  id: string;
  status: 'committed' | 'rolled_back';
  timestamp: Date;
  duration?: number;
}

interface TransactionStatistics {
  activeTransactions: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageDuration: number;
}