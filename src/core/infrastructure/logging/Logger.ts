/**
 * Advanced logging system with multiple transports
 */
import { ILogger } from '../../shared/contracts';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: any;
  error?: Error;
  context?: string;
}

export interface ITransport {
  log(entry: LogEntry): void;
}

/**
 * Console transport
 */
export class ConsoleTransport implements ITransport {
  private colors = {
    [LogLevel.TRACE]: '\x1b[90m',  // Gray
    [LogLevel.DEBUG]: '\x1b[36m',  // Cyan
    [LogLevel.INFO]: '\x1b[32m',   // Green
    [LogLevel.WARN]: '\x1b[33m',   // Yellow
    [LogLevel.ERROR]: '\x1b[31m'   // Red
  };

  private reset = '\x1b[0m';

  public log(entry: LogEntry): void {
    const color = this.colors[entry.level];
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    let message = `${color}[${timestamp}] [${levelName}]${this.reset} ${entry.message}`;
    
    if (entry.context) {
      message = `${color}[${entry.context}]${this.reset} ${message}`;
    }
    
    console.log(message);
    
    if (entry.metadata) {
      console.log('Metadata:', entry.metadata);
    }
    
    if (entry.error) {
      console.error('Error:', entry.error);
    }
  }
}

/**
 * File transport
 */
export class FileTransport implements ITransport {
  private writeStream: any;

  constructor(private filename: string) {
    // In real implementation, use fs.createWriteStream
  }

  public log(entry: LogEntry): void {
    const logLine = JSON.stringify({
      ...entry,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name
      } : undefined
    }) + '\n';
    
    // Write to file
    // this.writeStream.write(logLine);
  }
}

/**
 * Advanced logger implementation
 */
export class Logger implements ILogger {
  private transports: ITransport[] = [];
  private level: LogLevel = LogLevel.INFO;
  private context?: string;
  private metadata: Record<string, any> = {};

  constructor(options?: {
    level?: LogLevel;
    transports?: ITransport[];
    context?: string;
  }) {
    if (options?.level !== undefined) {
      this.level = options.level;
    }
    
    if (options?.transports) {
      this.transports = options.transports;
    } else {
      this.transports = [new ConsoleTransport()];
    }
    
    if (options?.context) {
      this.context = options.context;
    }
  }

  public trace(message: string, meta?: any): void {
    this.log(LogLevel.TRACE, message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public error(message: string, error?: Error, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta, error);
  }

  /**
   * Create child logger with context
   */
  public child(context: string, metadata?: Record<string, any>): Logger {
    const child = new Logger({
      level: this.level,
      transports: this.transports,
      context: this.context ? `${this.context}:${context}` : context
    });
    
    child.metadata = { ...this.metadata, ...metadata };
    
    return child;
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Add transport
   */
  public addTransport(transport: ITransport): void {
    this.transports.push(transport);
  }

  /**
   * Remove transport
   */
  public removeTransport(transport: ITransport): void {
    this.transports = this.transports.filter(t => t !== transport);
  }

  /**
   * Add metadata to all logs
   */
  public setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  /**
   * Static factory method
   */
  public static create(context: string, options?: {
    level?: LogLevel;
    transports?: ITransport[];
  }): Logger {
    return new Logger({
      ...options,
      context
    });
  }

  private log(level: LogLevel, message: string, meta?: any, error?: Error): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      metadata: { ...this.metadata, ...meta },
      error,
      context: this.context
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        console.error('Transport error:', err);
      }
    }
  }
}

/**
 * Logger factory
 */
export class LoggerFactory {
  private static defaultLogger: Logger;
  private static loggers: Map<string, Logger> = new Map();

  /**
   * Get default logger
   */
  public static getDefault(): Logger {
    if (!this.defaultLogger) {
      this.defaultLogger = new Logger();
    }
    return this.defaultLogger;
  }

  /**
   * Get or create logger for context
   */
  public static getLogger(context: string): Logger {
    if (!this.loggers.has(context)) {
      this.loggers.set(context, this.getDefault().child(context));
    }
    return this.loggers.get(context)!;
  }

  /**
   * Configure default logger
   */
  public static configure(options: {
    level?: LogLevel;
    transports?: ITransport[];
  }): void {
    this.defaultLogger = new Logger(options);
    this.loggers.clear();
  }
}

/**
 * Performance logger
 */
export class PerformanceLogger {
  private logger: Logger;
  private timers: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start timing an operation
   */
  public start(operation: string): void {
    this.timers.set(operation, Date.now());
    this.logger.debug(`Started operation: ${operation}`);
  }

  /**
   * End timing and log result
   */
  public end(operation: string, metadata?: any): void {
    const startTime = this.timers.get(operation);
    
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    this.logger.info(`Completed operation: ${operation}`, {
      duration,
      ...metadata
    });
  }

  /**
   * Time a function execution
   */
  public async time<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.start(operation);
    
    try {
      const result = await fn();
      this.end(operation, { status: 'success' });
      return result;
    } catch (error) {
      this.end(operation, { status: 'error', error: (error as Error).message });
      throw error;
    }
  }
}