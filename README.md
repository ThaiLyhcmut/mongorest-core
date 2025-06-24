# @mongorest/core

A flexible REST API framework supporting multiple databases with built-in RBAC, relationships, and schema validation.

## Features

- **Multi-Database Support**: MongoDB, PostgreSQL, MySQL, Elasticsearch
- **Built-in RBAC**: Role-based access control at collection and field level
- **Relationship Management**: One-to-One, One-to-Many, Many-to-One, Many-to-Many
- **Schema Validation**: JSON Schema validation with AJV
- **Query Conversion**: Convert URL parameters to database-specific queries
- **Error Handling**: Comprehensive error system with proper HTTP status codes
- **TypeScript**: Full TypeScript support with strict typing

## Installation

```bash
npm install @mongorest/core
```

## Quick Start

```typescript
import { createMongorestCore, MongoDBAdapter } from '@mongorest/core';

// Initialize the core with MongoDB
const core = await createMongorestCore({
  adapters: {
    mongodb: new MongoDBAdapter({
      uri: 'mongodb://localhost:27017',
      database: 'myapp'
    })
  },
  defaultAdapter: 'mongodb'
});

// Create a record
const result = await core.create('users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Query records
const users = await core.read('users', {
  filter: { age: { $gte: 18 } },
  limit: 10,
  sort: { createdAt: -1 }
});
```

## Database Adapters

### MongoDB

```typescript
import { MongoDBAdapter } from '@mongorest/core';

const mongoAdapter = new MongoDBAdapter({
  uri: 'mongodb://localhost:27017',
  database: 'myapp',
  options: {
    // MongoDB connection options
  }
});
```

### PostgreSQL

```typescript
import { PostgreSQLAdapter } from '@mongorest/core';

const pgAdapter = new PostgreSQLAdapter({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});
```

### MySQL

```typescript
import { MySQLAdapter } from '@mongorest/core';

const mysqlAdapter = new MySQLAdapter({
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  user: 'root',
  password: 'password'
});
```

### Elasticsearch

```typescript
import { ElasticsearchAdapter } from '@mongorest/core';

const esAdapter = new ElasticsearchAdapter({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'password'
  }
});
```

## RBAC (Role-Based Access Control)

```typescript
// Define RBAC rules
const rbacRules = {
  collections: {
    users: {
      admin: { read: true, write: true, delete: true },
      user: { read: ['own'], write: ['own'], delete: false }
    }
  },
  fields: {
    users: {
      admin: { read: ['*'], write: ['*'] },
      user: { read: ['name', 'email'], write: ['name'] }
    }
  }
};

// Use with core
const result = await core.read('users', {
  user: { id: '123', roles: ['user'] }
});
```

## Relationships

```typescript
// Define relationships
core.relationships.register('users', 'posts', {
  type: 'one-to-many',
  localField: '_id',
  foreignField: 'userId'
});

// Query with relationships
const usersWithPosts = await core.read('users', {
  populate: ['posts']
});
```

## Schema Validation

```typescript
// Define schema
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0 }
  },
  required: ['name', 'email']
};

// Register schema
core.schemas.register('users', userSchema);

// Validation happens automatically on create/update
```

## Query Conversion

The framework automatically converts URL query parameters to database-specific queries:

```typescript
// URL: /api/users?name=John&age[$gte]=18&$sort=-createdAt&$limit=10
// Converts to:
{
  filter: {
    name: 'John',
    age: { $gte: 18 }
  },
  sort: { createdAt: -1 },
  limit: 10
}
```

## Error Handling

```typescript
import { ErrorCodes } from '@mongorest/core';

try {
  await core.create('users', invalidData);
} catch (error) {
  if (error.code === ErrorCodes.VALIDATION_FAILED) {
    // Handle validation error
  }
}
```

## Advanced Configuration

```typescript
const core = await createMongorestCore({
  adapters: {
    mongodb: mongoAdapter,
    postgresql: pgAdapter
  },
  defaultAdapter: 'mongodb',
  rbac: {
    enabled: true,
    defaultRoles: ['guest']
  },
  schema: {
    strictMode: true,
    autoLoad: true,
    directory: './schemas'
  },
  relationships: {
    autoPopulate: false,
    maxDepth: 3
  },
  query: {
    maxLimit: 100,
    defaultLimit: 20
  },
  errors: {
    includeStack: process.env.NODE_ENV === 'development',
    logErrors: true
  }
});
```

## API Reference

### Core Methods

#### `create(collection: string, data: any, options?: CoreOptions)`
Create a new record in the specified collection.

#### `read(collection: string, query?: any, options?: QueryOptions)`
Read records from the specified collection.

#### `update(collection: string, id: any, data: any, options?: CoreOptions)`
Update a record by ID.

#### `delete(collection: string, id: any, options?: CoreOptions)`
Delete a record by ID.

#### `aggregate(collection: string, pipeline: any[], options?: CoreOptions)`
Run aggregation pipeline (adapter-specific).

### Types

```typescript
interface CoreOptions {
  adapter?: string;
  skipRbac?: boolean;
  skipValidation?: boolean;
  user?: any;
  context?: Record<string, any>;
}

interface QueryOptions extends CoreOptions {
  populate?: string[];
  select?: string[];
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/yourusername/mongorest-core/issues).