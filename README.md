# MongoREST Core

A powerful, enterprise-grade REST API framework supporting multiple databases with built-in RBAC, relationships, query optimization, caching, and advanced middleware system.

## 🚀 Features

- **Multi-Database Support**: MongoDB, PostgreSQL, MySQL, Elasticsearch
- **Enterprise Architecture**: Domain-driven design with clean separation of concerns
- **Advanced Caching**: Multi-tier caching with LRU, LFU, FIFO strategies
- **Connection Pooling**: Smart connection management with health monitoring
- **Query Optimization**: Intelligent query analysis and performance tracking
- **RBAC System**: Role-based access control with fine-grained permissions
- **Middleware Pipeline**: Extensible middleware system for custom business logic
- **Transaction Support**: Cross-adapter transaction management
- **Schema Validation**: Comprehensive data validation with AJV
- **Rate Limiting**: Multiple rate limiting strategies (token bucket, sliding window)
- **Migration System**: Database migration management
- **TypeScript Support**: Full TypeScript support with type definitions

## 📦 Installation

```bash
npm install mongorest-core
```

## 🔧 Quick Start

### Basic Setup

```typescript
import { CoreService, DatabaseAdapter } from 'mongorest-core';
import { MongoDBAdapter } from 'mongorest-core/adapters/mongodb';

// Initialize adapters
const mongoAdapter = new MongoDBAdapter({
  connectionString: 'mongodb://localhost:27017/mydb'
});

// Create core service
const coreService = new CoreService({
  adapters: new Map([['mongodb', mongoAdapter]]),
  defaultAdapter: 'mongodb'
});

// Query data
const result = await coreService.query({
  collection: 'users',
  filter: {
    conditions: [{
      field: 'status',
      operator: 'eq',
      value: 'active'
    }]
  }
});
```

## 🔗 REST API & URL Parameter Conversion

MongoREST Core automatically converts URL query parameters to database queries, making it easy to build powerful REST APIs.

### URL to Query Conversion

```typescript
// URL: /api/users?name=John&status=active&age=gte.25&order=-createdAt&limit=10
// Automatically converts to:
{
  collection: 'users',
  filter: {
    conditions: [
      { field: 'name', operator: 'eq', value: 'John' },
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'age', operator: 'gte', value: 25 }
    ]
  },
  sort: [{ field: 'createdAt', direction: 'desc' }],
  pagination: { limit: 10 }
}
```

### Supported Query Syntax

```bash
# Basic filtering
GET /api/users?name=John&status=active

# Comparison operators
GET /api/products?price=gt.100&price=lt.1000
GET /api/users?age=gte.18&status=neq.banned

# Logical operators
GET /api/products?or=(category.eq.electronics,category.eq.books)
GET /api/users?and=(status.eq.active,emailVerified.eq.true)

# Array operations
GET /api/products?category=in.(electronics,books,clothing)
GET /api/users?role=nin.(admin,superuser)

# Text search
GET /api/products?name=like.iPhone
GET /api/products?description=regex.^Apple.*

# Sorting
GET /api/users?order=name              # ascending
GET /api/users?order=-createdAt        # descending
GET /api/users?order=status,-createdAt,name  # multiple fields

# Pagination
GET /api/users?limit=20&offset=40
GET /api/users?page=3&limit=10

# Field selection
GET /api/users?select=name,email,status
GET /api/users?select=-password,-sensitiveData

# Relationships
GET /api/orders?populate=customer,items.product
GET /api/users?populate=posts(status.eq.published)
```

### Generic REST Endpoint

```typescript
import { QueryConverter } from 'mongorest-core';

const converter = new QueryConverter();

app.get('/api/:collection', async (req, res) => {
  // Convert URL parameters to MongoREST query
  const query = converter.convert(req.query, req.params.collection);
  
  // Execute with automatic caching, RBAC, etc.
  const result = await coreService.query(query, {
    user: req.user,
    useCache: true
  });
  
  res.json(result);
});
```

For complete REST API documentation, see [REST API Guide](./docs/REST_API_GUIDE.md).

## 🌐 Framework Integration

### Express.js Integration

```typescript
import express from 'express';
import { CoreService, ExpressMiddleware } from 'mongorest-core';
import { MongoDBAdapter } from 'mongorest-core/adapters/mongodb';

const app = express();
app.use(express.json());

// Setup MongoREST Core
const mongoAdapter = new MongoDBAdapter({
  connectionString: process.env.MONGODB_URL
});

const coreService = new CoreService({
  adapters: new Map([['mongodb', mongoAdapter]]),
  defaultAdapter: 'mongodb',
  rbac: {
    enabled: true
  }
});

// Create REST endpoints
app.use('/api', ExpressMiddleware.createRESTRoutes(coreService, {
  collections: ['users', 'products', 'orders'],
  enableCaching: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
}));

// Custom routes
app.get('/api/users/:id/orders', async (req, res) => {
  try {
    const result = await coreService.query({
      collection: 'orders',
      filter: {
        conditions: [{
          field: 'userId',
          operator: 'eq',
          value: req.params.id
        }]
      },
      populate: ['products', 'shipping']
    }, {
      user: req.user // for RBAC
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Fastify Integration

```typescript
import fastify from 'fastify';
import { CoreService, FastifyPlugin } from 'mongorest-core';
import { PostgreSQLAdapter } from 'mongorest-core/adapters/postgresql';

const server = fastify({ logger: true });

// Setup MongoREST Core with PostgreSQL
const pgAdapter = new PostgreSQLAdapter({
  host: process.env.PG_HOST,
  port: 5432,
  database: process.env.PG_DATABASE,
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD
});

const coreService = new CoreService({
  adapters: new Map([['postgresql', pgAdapter]]),
  defaultAdapter: 'postgresql',
  cache: new RedisCache({
    host: process.env.REDIS_HOST,
    port: 6379
  })
});

// Register MongoREST plugin
await server.register(FastifyPlugin, {
  coreService,
  prefix: '/api',
  collections: ['users', 'posts', 'comments'],
  enableSwagger: true
});

// Custom hooks
server.addHook('preHandler', async (request, reply) => {
  // Authentication logic
  request.user = await authenticateUser(request.headers.authorization);
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Server running on port 3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
```

### Koa.js Integration

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { CoreService, KoaMiddleware } from 'mongorest-core';
import { MySQLAdapter } from 'mongorest-core/adapters/mysql';

const app = new Koa();
const router = new Router();

app.use(bodyParser());

// Setup MongoREST Core with MySQL
const mysqlAdapter = new MySQLAdapter({
  host: process.env.MYSQL_HOST,
  port: 3306,
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD
});

const coreService = new CoreService({
  adapters: new Map([['mysql', mysqlAdapter]]),
  defaultAdapter: 'mysql'
});

// Apply MongoREST middleware
router.use('/api', KoaMiddleware.createRESTRoutes(coreService, {
  collections: ['users', 'products']
}));

// Custom middleware
app.use(async (ctx, next) => {
  ctx.state.user = await authenticateUser(ctx.headers.authorization);
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
```

### NestJS Integration

```typescript
import { Module, Injectable, Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CoreService } from 'mongorest-core';
import { ElasticsearchAdapter } from 'mongorest-core/adapters/elasticsearch';

@Injectable()
export class DatabaseService {
  private coreService: CoreService;

  constructor() {
    const esAdapter = new ElasticsearchAdapter({
      node: process.env.ELASTICSEARCH_URL
    });

    this.coreService = new CoreService({
      adapters: new Map([['elasticsearch', esAdapter]]),
      defaultAdapter: 'elasticsearch'
    });
  }

  async query(collection: string, query: any, options?: any) {
    return this.coreService.query({
      collection,
      ...query
    }, options);
  }

  async create(collection: string, data: any, options?: any) {
    return this.coreService.create(collection, data, options);
  }
}

@Controller('api')
export class ApiController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get(':collection')
  async findAll(@Param('collection') collection: string) {
    return this.databaseService.query(collection, {});
  }

  @Post(':collection')
  async create(@Param('collection') collection: string, @Body() data: any) {
    return this.databaseService.create(collection, data);
  }
}

@Module({
  providers: [DatabaseService],
  controllers: [ApiController],
})
export class AppModule {}
```

## 🔧 Advanced Configuration

### Multi-Database Setup

```typescript
import { CoreService } from 'mongorest-core';
import { MongoDBAdapter } from 'mongorest-core/adapters/mongodb';
import { PostgreSQLAdapter } from 'mongorest-core/adapters/postgresql';
import { ElasticsearchAdapter } from 'mongorest-core/adapters/elasticsearch';

const mongoAdapter = new MongoDBAdapter({
  connectionString: process.env.MONGODB_URL
});

const pgAdapter = new PostgreSQLAdapter({
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD
});

const esAdapter = new ElasticsearchAdapter({
  node: process.env.ELASTICSEARCH_URL
});

const coreService = new CoreService({
  adapters: new Map([
    ['mongodb', mongoAdapter],
    ['postgresql', pgAdapter],
    ['elasticsearch', esAdapter]
  ]),
  defaultAdapter: 'mongodb'
});

// Query different databases
const mongoResult = await coreService.query({
  collection: 'users'
}, { adapter: 'mongodb' });

const pgResult = await coreService.query({
  collection: 'analytics'
}, { adapter: 'postgresql' });

const esResult = await coreService.query({
  collection: 'logs'
}, { adapter: 'elasticsearch' });
```

### Middleware System

```typescript
import { IMiddleware, IMiddlewareContext } from 'mongorest-core';

// Custom authentication middleware
class AuthMiddleware implements IMiddleware<IMiddlewareContext> {
  async execute(context: IMiddlewareContext, next: () => Promise<void>): Promise<void> {
    const user = context.metadata.get('user');
    
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Add user context
    context.metadata.set('authenticatedUser', user);
    await next();
  }
}

// Custom logging middleware
class LoggingMiddleware implements IMiddleware<IMiddlewareContext> {
  async execute(context: IMiddlewareContext, next: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`Starting operation: ${context.request.operation}`);
    
    await next();
    
    const duration = Date.now() - startTime;
    console.log(`Operation completed in ${duration}ms`);
  }
}

// Register middlewares
const coreService = new CoreService({
  adapters: adapters,
  defaultAdapter: 'mongodb',
  middlewares: [
    new LoggingMiddleware(),
    new AuthMiddleware()
  ]
});
```

### Caching Configuration

```typescript
import { MemoryCache, RedisCache, CompositeCache } from 'mongorest-core/cache';

// Memory cache
const memoryCache = new MemoryCache({
  maxSize: 1000,
  strategy: 'LRU'
});

// Redis cache
const redisCache = new RedisCache({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Composite cache (L1: Memory, L2: Redis)
const compositeCache = new CompositeCache([memoryCache, redisCache]);

const coreService = new CoreService({
  adapters: adapters,
  defaultAdapter: 'mongodb',
  cache: compositeCache
});
```

### Rate Limiting

```typescript
import { TokenBucketRateLimiter, SlidingWindowRateLimiter } from 'mongorest-core/security';

// Token bucket rate limiter
const tokenBucket = new TokenBucketRateLimiter({
  capacity: 100,
  refillRate: 10, // tokens per second
  refillPeriod: 1000
});

// Sliding window rate limiter
const slidingWindow = new SlidingWindowRateLimiter({
  windowSize: 60000, // 1 minute
  maxRequests: 100
});

// Apply to Express routes
app.use('/api', rateLimitMiddleware(tokenBucket));
```

## 📊 Query Examples

### Basic Queries

```typescript
// Simple find
const users = await coreService.query({
  collection: 'users',
  filter: {
    conditions: [{
      field: 'status',
      operator: 'eq',
      value: 'active'
    }]
  }
});

// Complex query with pagination
const products = await coreService.query({
  collection: 'products',
  filter: {
    operator: 'and',
    conditions: [
      { field: 'category', operator: 'eq', value: 'electronics' },
      { field: 'price', operator: 'gte', value: 100 }
    ]
  },
  sort: [{ field: 'price', direction: 'desc' }],
  pagination: { limit: 20, offset: 0 }
});

// Query with relationships
const ordersWithDetails = await coreService.query({
  collection: 'orders',
  populate: ['customer', 'items.product'],
  filter: {
    conditions: [{
      field: 'status',
      operator: 'eq',
      value: 'completed'
    }]
  }
});
```

### CRUD Operations

```typescript
// Create
const newUser = await coreService.create('users', {
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active'
});

// Update
const updatedUser = await coreService.update('users', newUser.id, {
  status: 'inactive'
});

// Delete
const deleted = await coreService.delete('users', newUser.id);
```

### Transactions

```typescript
// Simple transaction
const result = await coreService.transaction(async (transaction) => {
  const user = await coreService.create('users', userData, { transaction });
  const profile = await coreService.create('profiles', {
    userId: user.id,
    ...profileData
  }, { transaction });
  
  return { user, profile };
});

// Unit of Work pattern
const uow = coreService.createUnitOfWork();
try {
  const transaction = await uow.begin();
  
  const order = await coreService.create('orders', orderData, { transaction });
  const inventory = await coreService.update('inventory', productId, {
    quantity: newQuantity
  }, { transaction });
  
  await uow.complete();
} catch (error) {
  await uow.rollback();
  throw error;
}
```

## 🔐 Security & RBAC

### Setting up RBAC

```typescript
import { RbacValidator } from 'mongorest-core/rbac';

const rbacValidator = new RbacValidator({
  roles: {
    'admin': ['*'],
    'user': ['users:read', 'orders:*'],
    'guest': ['products:read']
  },
  collections: {
    'users': ['read', 'create', 'update', 'delete'],
    'orders': ['read', 'create', 'update', 'delete'],
    'products': ['read']
  }
});

const coreService = new CoreService({
  adapters: adapters,
  defaultAdapter: 'mongodb',
  rbac: {
    enabled: true,
    validator: rbacValidator
  }
});

// Queries will automatically apply RBAC rules
const result = await coreService.query({
  collection: 'users'
}, {
  user: { id: 1, roles: ['user'] }
});
```

## 📈 Monitoring & Performance

### Query Optimization

```typescript
import { QueryOptimizer } from 'mongorest-core/optimization';

const optimizer = new QueryOptimizer({
  enableIndexSuggestions: true,
  enableQueryRewriting: true,
  enablePerformanceTracking: true
});

const coreService = new CoreService({
  adapters: adapters,
  defaultAdapter: 'mongodb',
  optimizer: optimizer
});

// Get performance statistics
const stats = optimizer.getStatistics();
console.log('Average query time:', stats.averageQueryTime);
console.log('Slow queries:', stats.slowQueries);
```

### Logging

```typescript
import { Logger } from 'mongorest-core/logging';

const logger = new Logger({
  level: 'info',
  format: 'json',
  transports: [
    { type: 'console' },
    { type: 'file', filename: 'app.log' },
    { type: 'http', url: 'http://logs.example.com' }
  ]
});

const coreService = new CoreService({
  adapters: adapters,
  defaultAdapter: 'mongodb',
  logger: logger
});
```

## 🧪 Testing

```typescript
import { MockDatabaseAdapter, TestSetup } from 'mongorest-core/testing';

describe('API Tests', () => {
  let coreService: CoreService;
  
  beforeEach(async () => {
    const mockAdapter = new MockDatabaseAdapter();
    coreService = new CoreService({
      adapters: new Map([['mock', mockAdapter]]),
      defaultAdapter: 'mock'
    });
    
    await TestSetup.seedData(mockAdapter, {
      users: [
        { id: 1, name: 'John', status: 'active' },
        { id: 2, name: 'Jane', status: 'inactive' }
      ]
    });
  });
  
  it('should query users', async () => {
    const result = await coreService.query({
      collection: 'users',
      filter: {
        conditions: [{ field: 'status', operator: 'eq', value: 'active' }]
      }
    });
    
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('John');
  });
});
```

## 🔧 Migration System

```typescript
import { MigrationManager, BaseMigration } from 'mongorest-core/migrations';

class CreateUsersTable extends BaseMigration {
  constructor() {
    super('2024.01.01.001', 'create_users_table');
  }

  async up(): Promise<void> {
    // Create users collection with indexes
    await this.adapter.createCollection('users');
    await this.adapter.createIndex('users', { email: 1 }, { unique: true });
  }

  async down(): Promise<void> {
    await this.adapter.dropCollection('users');
  }
}

const migrationManager = new MigrationManager(adapter);
migrationManager.register(new CreateUsersTable());

// Run migrations
await migrationManager.migrate();

// Get migration status
const status = await migrationManager.status();
console.log(status);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://mongorest-core.docs.com)
- 🐛 [Issues](https://github.com/thailyHcmut/mongorest-core/issues)
- 💬 [Discussions](https://github.com/thailyHcmut/mongorest-core/discussions)
- 📧 Email: support@mongorest-core.com

## 🗺️ Roadmap

- [ ] GraphQL support
- [ ] Real-time subscriptions
- [ ] Additional database adapters
- [ ] Enhanced security features
- [ ] Performance optimizations
- [ ] Cloud deployment guides