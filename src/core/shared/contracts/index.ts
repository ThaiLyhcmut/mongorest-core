/**
 * Core contracts and interfaces for the MongoREST framework
 */

// Base Repository Contract
export interface IRepository<T> {
  find(query: IQuery): Promise<T[]>;
  findOne(query: IQuery): Promise<T | null>;
  findById(id: string | number): Promise<T | null>;
  count(query: IQuery): Promise<number>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
  exists(query: IQuery): Promise<boolean>;
}

// Query Contract
export interface IQuery {
  collection: string;
  filter?: Record<string, any>;
  select?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  populate?: IPopulateOption[];
}

// Populate Option
export interface IPopulateOption {
  path: string;
  select?: string[];
  match?: Record<string, any>;
  populate?: IPopulateOption[];
}

// Cache Contract
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// Logger Contract
export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  trace(message: string, meta?: any): void;
}

// Validator Contract
export interface IValidator<T = any> {
  validate(data: T): Promise<IValidationResult>;
  validatePartial(data: Partial<T>): Promise<IValidationResult>;
}

// Validation Result
export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
}

// Validation Error
export interface IValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Query Converter Contract
export interface IQueryConverter<TNative = any> {
  convert(query: IQuery): TNative;
  convertFilter(filter: Record<string, any>): any;
  convertSort(sort: Record<string, 1 | -1>): any;
  convertProjection(fields: string[]): any;
}

// Connection Pool Contract
export interface IConnectionPool<TConnection = any> {
  acquire(): Promise<TConnection>;
  release(connection: TConnection): Promise<void>;
  drain(): Promise<void>;
  size(): number;
  available(): number;
  pending(): number;
}

// Transaction Contract
export interface ITransaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

// Unit of Work Contract
export interface IUnitOfWork {
  begin(): Promise<ITransaction>;
  complete(): Promise<void>;
  rollback(): Promise<void>;
}

// Middleware Contract
export interface IMiddleware<TContext = any> {
  execute(context: TContext, next: () => Promise<void>): Promise<void>;
}

// Event Contract
export interface IEvent {
  name: string;
  timestamp: Date;
  data: any;
}

// Event Emitter Contract
export interface IEventEmitter {
  emit(event: IEvent): void;
  on(eventName: string, handler: (event: IEvent) => void): void;
  off(eventName: string, handler: (event: IEvent) => void): void;
}

// Query Result
export interface IQueryResult<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

// Bulk Operation Contract
export interface IBulkOperation<T> {
  insert(items: T[]): IBulkOperation<T>;
  update(filter: any, update: Partial<T>): IBulkOperation<T>;
  updateMany(updates: Array<{ filter: any; update: Partial<T> }>): IBulkOperation<T>;
  delete(filter: any): IBulkOperation<T>;
  execute(): Promise<IBulkResult>;
}

// Bulk Result
export interface IBulkResult {
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  errors: Error[];
}

// Migration Contract
export interface IMigration {
  version: string;
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

// Migration Manager Contract
export interface IMigrationManager {
  migrate(): Promise<void>;
  rollback(steps?: number): Promise<void>;
  status(): Promise<IMigrationStatus[]>;
}

// Migration Status
export interface IMigrationStatus {
  version: string;
  name: string;
  appliedAt?: Date;
  status: 'pending' | 'applied';
}

// Health Check Contract
export interface IHealthCheck {
  check(): Promise<IHealthStatus>;
}

// Health Status
export interface IHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
}

// Rate Limiter Contract
export interface IRateLimiter {
  consume(identifier: string, points?: number): Promise<IRateLimitResult>;
  delete(identifier: string): Promise<void>;
}

// Rate Limit Result
export interface IRateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
}

// Query Optimizer Contract
export interface IQueryOptimizer {
  optimize(query: IQuery): Promise<IQuery>;
  analyze(query: IQuery): Promise<IQueryAnalysis>;
}

// Query Analysis
export interface IQueryAnalysis {
  estimatedCost: number;
  suggestedIndexes: string[];
  warnings: string[];
  executionPlan?: any;
}