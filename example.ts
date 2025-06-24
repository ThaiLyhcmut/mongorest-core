import { createMongorestCore, MongoDBAdapter, PostgreSQLAdapter } from './src';

async function example() {
  // Initialize with multiple adapters
  const core = await createMongorestCore({
    adapters: {
      mongodb: new MongoDBAdapter({
        uri: 'mongodb://localhost:27017',
        database: 'myapp'
      }),
      postgresql: new PostgreSQLAdapter({
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        user: 'postgres',
        password: 'password'
      })
    },
    defaultAdapter: 'mongodb',
    rbac: {
      enabled: true
    },
    schema: {
      strictMode: true
    }
  });

  // Example 1: Create a user
  const newUser = await core.create('users', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  });
  console.log('Created user:', newUser);

  // Example 2: Query users with filtering
  const adults = await core.read('users', {
    filter: { age: { $gte: 18 } },
    limit: 10,
    sort: { name: 1 }
  });
  console.log('Adult users:', adults);

  // Example 3: Update a user
  const updated = await core.update('users', newUser.id, {
    age: 31
  });
  console.log('Updated user:', updated);

  // Example 4: Use relationships
  core.relationships.register('users', 'posts', {
    type: 'one-to-many',
    localField: '_id',
    foreignField: 'userId'
  });

  const usersWithPosts = await core.read('users', {
    populate: ['posts']
  });
  console.log('Users with posts:', usersWithPosts);

  // Example 5: Use PostgreSQL adapter for specific query
  const pgUsers = await core.read('users', {}, {
    adapter: 'postgresql'
  });
  console.log('PostgreSQL users:', pgUsers);

  // Example 6: RBAC example
  const userContext = {
    id: '123',
    roles: ['user']
  };

  const ownData = await core.read('users', {
    filter: { _id: userContext.id }
  }, {
    user: userContext
  });
  console.log('User own data:', ownData);
}

// Run example
example().catch(console.error);