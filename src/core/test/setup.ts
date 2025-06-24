import 'jest';

// Global test setup
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise in tests
  if (process.env.QUIET_TESTS === 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  }
});

afterAll(() => {
  // Clean up after all tests
  jest.restoreAllMocks();
});

// Global test utilities
(global as any).testUtils = {
  createMockDate: (dateString: string) => new Date(dateString),
  
  createMockQuery: (overrides = {}) => ({
    collection: 'test',
    filter: {
      conditions: [
        { field: 'id', operator: 'eq', value: 1 }
      ]
    },
    ...overrides
  }),
  
  createMockResult: (data: any[] = [], overrides = {}) => ({
    data,
    metadata: {
      adapter: 'mock',
      query: { collection: 'test' },
      executionTime: 100
    },
    ...overrides
  })
};

// Extend global namespace for TypeScript
declare global {
  var testUtils: {
    createMockDate: (dateString: string) => Date;
    createMockQuery: (overrides?: any) => any;
    createMockResult: (data?: any[], overrides?: any) => any;
  };
}

// Add custom matchers
expect.extend({
  toBeValidQuery(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 typeof received.collection === 'string' && 
                 received.collection.length > 0;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid query`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid query with collection property`,
        pass: false,
      };
    }
  },
  
  toBeValidResult(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 Array.isArray(received.data) &&
                 received.metadata &&
                 typeof received.metadata.adapter === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid result with data array and metadata`,
        pass: false,
      };
    }
  }
});

// Extend Jest matchers interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidQuery(): R;
      toBeValidResult(): R;
    }
  }
}