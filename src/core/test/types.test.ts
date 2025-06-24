import {
  IntermediateQuery,
  IntermediateQueryResult,
  FilterCondition,
  FieldCondition,
  SelectClause,
  SortClause,
  PaginationClause,
  JoinClause,
  AggregationClause,
  ComparisonOperator,
  JoinType,
  AggregationType
} from '../types/intermediateQuery';

describe('Intermediate Query Types', () => {
  describe('IntermediateQuery', () => {
    it('should create a basic intermediate query', () => {
      const query: IntermediateQuery = {
        collection: 'users'
      };

      expect(query.collection).toBe('users');
      expect(query.filter).toBeUndefined();
      expect(query.select).toBeUndefined();
      expect(query.sort).toBeUndefined();
      expect(query.pagination).toBeUndefined();
      expect(query.joins).toBeUndefined();
      expect(query.aggregations).toBeUndefined();
      expect(query.metadata).toBeUndefined();
    });

    it('should create a complete intermediate query', () => {
      const query: IntermediateQuery = {
        collection: 'users',
        filter: {
          conditions: [
            { field: 'name', operator: 'eq', value: 'John' }
          ]
        },
        select: {
          fields: ['name', 'email']
        },
        sort: [
          { field: 'created_at', direction: 'desc' }
        ],
        pagination: {
          offset: 0,
          limit: 10,
          count: true
        },
        joins: [
          {
            type: 'lookup',
            target: 'posts',
            alias: 'user_posts',
            on: [
              { local: 'id', foreign: 'user_id', operator: 'eq' }
            ]
          }
        ],
        aggregations: [
          {
            type: 'count',
            alias: 'total_count'
          }
        ],
        metadata: {
          originalParams: { name: 'John' },
          roles: ['user'],
          source: 'rest-api',
          timestamp: new Date()
        }
      };

      expect(query).toBeDefined();
      expect(query.collection).toBe('users');
      expect(query.filter?.conditions).toHaveLength(1);
      expect(query.select?.fields).toEqual(['name', 'email']);
      expect(query.sort).toHaveLength(1);
      expect(query.pagination?.limit).toBe(10);
      expect(query.joins).toHaveLength(1);
      expect(query.aggregations).toHaveLength(1);
      expect(query.metadata?.roles).toEqual(['user']);
    });
  });

  describe('FilterCondition', () => {
    it('should create simple field conditions', () => {
      const filter: FilterCondition = {
        conditions: [
          { field: 'name', operator: 'eq', value: 'John' },
          { field: 'age', operator: 'gt', value: 25 }
        ]
      };

      expect(filter.conditions).toHaveLength(2);
      expect(filter.operator).toBeUndefined();
      expect(filter.nested).toBeUndefined();
    });

    it('should create logical conditions', () => {
      const filter: FilterCondition = {
        operator: 'or',
        conditions: [
          { field: 'role', operator: 'eq', value: 'admin' },
          { field: 'permissions', operator: 'in', value: ['read', 'write'] }
        ]
      };

      expect(filter.operator).toBe('or');
      expect(filter.conditions).toHaveLength(2);
    });

    it('should create nested conditions', () => {
      const filter: FilterCondition = {
        operator: 'and',
        nested: [
          {
            operator: 'or',
            conditions: [
              { field: 'status', operator: 'eq', value: 'active' },
              { field: 'status', operator: 'eq', value: 'pending' }
            ]
          },
          {
            conditions: [
              { field: 'verified', operator: 'eq', value: true }
            ]
          }
        ]
      };

      expect(filter.operator).toBe('and');
      expect(filter.nested).toHaveLength(2);
      expect(filter.nested?.[0].operator).toBe('or');
    });
  });

  describe('FieldCondition', () => {
    it('should create field conditions with all operators', () => {
      const operators: ComparisonOperator[] = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'nin', 'like', 'ilike', 'regex',
        'exists', 'null', 'notnull', 'contains', 'startswith', 'endswith'
      ];

      operators.forEach(operator => {
        const condition: FieldCondition = {
          field: 'test_field',
          operator,
          value: 'test_value'
        };

        expect(condition.field).toBe('test_field');
        expect(condition.operator).toBe(operator);
        expect(condition.value).toBe('test_value');
      });
    });

    it('should support modifiers', () => {
      const condition: FieldCondition = {
        field: 'name',
        operator: 'like',
        value: 'John%',
        modifiers: ['case_insensitive', 'trim']
      };

      expect(condition.modifiers).toEqual(['case_insensitive', 'trim']);
    });
  });

  describe('SelectClause', () => {
    it('should create select with fields', () => {
      const select: SelectClause = {
        fields: ['name', 'email', 'age']
      };

      expect(select.fields).toEqual(['name', 'email', 'age']);
    });

    it('should create select with excluded fields', () => {
      const select: SelectClause = {
        exclude: ['password', 'secret_key']
      };

      expect(select.exclude).toEqual(['password', 'secret_key']);
    });

    it('should create select with aliases', () => {
      const select: SelectClause = {
        fields: ['name', 'email'],
        aliases: {
          'full_name': 'name',
          'contact_email': 'email'
        }
      };

      expect(select.aliases).toEqual({
        'full_name': 'name',
        'contact_email': 'email'
      });
    });

    it('should create select with computed fields', () => {
      const select: SelectClause = {
        fields: ['name'],
        computed: [
          {
            alias: 'full_name',
            expression: 'CONCAT(first_name, " ", last_name)',
            type: 'function'
          },
          {
            alias: 'age_group',
            expression: 'CASE WHEN age < 18 THEN "minor" ELSE "adult" END',
            type: 'expression'
          }
        ]
      };

      expect(select.computed).toHaveLength(2);
      expect(select.computed?.[0].type).toBe('function');
      expect(select.computed?.[1].type).toBe('expression');
    });
  });

  describe('SortClause', () => {
    it('should create sort clauses', () => {
      const sorts: SortClause[] = [
        { field: 'name', direction: 'asc' },
        { field: 'created_at', direction: 'desc' },
        { field: 'priority', direction: 'asc', nulls: 'last' }
      ];

      expect(sorts).toHaveLength(3);
      expect(sorts[0].direction).toBe('asc');
      expect(sorts[1].direction).toBe('desc');
      expect(sorts[2].nulls).toBe('last');
    });
  });

  describe('PaginationClause', () => {
    it('should create pagination with all options', () => {
      const pagination: PaginationClause = {
        offset: 20,
        limit: 10,
        count: true
      };

      expect(pagination.offset).toBe(20);
      expect(pagination.limit).toBe(10);
      expect(pagination.count).toBe(true);
    });

    it('should create pagination with partial options', () => {
      const pagination: PaginationClause = {
        limit: 50
      };

      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBeUndefined();
      expect(pagination.count).toBeUndefined();
    });
  });

  describe('JoinClause', () => {
    it('should create different join types', () => {
      const joinTypes: JoinType[] = [
        'inner', 'left', 'right', 'full',
        'lookup', 'embed', 'many-to-one',
        'one-to-many', 'many-to-many', 'one-to-one'
      ];

      joinTypes.forEach(type => {
        const join: JoinClause = {
          type,
          target: 'related_table',
          on: [
            { local: 'id', foreign: 'parent_id', operator: 'eq' }
          ]
        };

        expect(join.type).toBe(type);
        expect(join.target).toBe('related_table');
        expect(join.on).toHaveLength(1);
      });
    });

    it('should create join with all options', () => {
      const join: JoinClause = {
        type: 'lookup',
        target: 'posts',
        alias: 'user_posts',
        on: [
          { local: 'id', foreign: 'user_id', operator: 'eq' }
        ],
        select: {
          fields: ['title', 'content', 'created_at']
        },
        filter: {
          conditions: [
            { field: 'status', operator: 'eq', value: 'published' }
          ]
        },
        joins: [
          {
            type: 'lookup',
            target: 'comments',
            alias: 'post_comments',
            on: [
              { local: 'id', foreign: 'post_id', operator: 'eq' }
            ]
          }
        ],
        relationship: {
          name: 'posts',
          junction: {
            table: 'user_posts',
            local: 'user_id',
            foreign: 'post_id'
          },
          preserveNull: false
        }
      };

      expect(join.alias).toBe('user_posts');
      expect(join.select?.fields).toEqual(['title', 'content', 'created_at']);
      expect(join.filter?.conditions).toHaveLength(1);
      expect(join.joins).toHaveLength(1);
      expect(join.relationship?.name).toBe('posts');
    });
  });

  describe('AggregationClause', () => {
    it('should create different aggregation types', () => {
      const aggregationTypes: AggregationType[] = [
        'count', 'sum', 'avg', 'min', 'max', 'group', 'having', 'distinct'
      ];

      aggregationTypes.forEach(type => {
        const aggregation: AggregationClause = {
          type,
          alias: `${type}_result`,
          field: type === 'count' ? undefined : 'value'
        };

        expect(aggregation.type).toBe(type);
        expect(aggregation.alias).toBe(`${type}_result`);
      });
    });

    it('should create aggregation with parameters', () => {
      const aggregation: AggregationClause = {
        type: 'group',
        field: 'category',
        alias: 'category_group',
        params: {
          having: 'COUNT(*) > 5',
          orderBy: 'COUNT(*) DESC'
        }
      };

      expect(aggregation.params).toEqual({
        having: 'COUNT(*) > 5',
        orderBy: 'COUNT(*) DESC'
      });
    });
  });

  describe('IntermediateQueryResult', () => {
    it('should create query result with all fields', () => {
      const result: IntermediateQueryResult<any> = {
        data: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ],
        count: 2,
        metadata: {
          executionTime: 150,
          adapter: 'mongodb',
          query: {
            collection: 'users',
            filter: {
              conditions: [
                { field: 'active', operator: 'eq', value: true }
              ]
            }
          },
          nativeQuery: [
            { $match: { active: true } }
          ]
        },
        pagination: {
          offset: 0,
          limit: 10,
          total: 2,
          hasMore: false
        }
      };

      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.metadata.executionTime).toBe(150);
      expect(result.metadata.adapter).toBe('mongodb');
      expect(result.pagination?.total).toBe(2);
      expect(result.pagination?.hasMore).toBe(false);
    });

    it('should create minimal query result', () => {
      const result: IntermediateQueryResult<any> = {
        data: [],
        metadata: {
          adapter: 'mock',
          query: { collection: 'test' }
        }
      };

      expect(result.data).toEqual([]);
      expect(result.metadata.adapter).toBe('mock');
      expect(result.count).toBeUndefined();
      expect(result.pagination).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct operator types', () => {
      // This test ensures TypeScript compilation catches type errors
      const validOperators: ComparisonOperator[] = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'nin', 'like', 'ilike', 'regex',
        'exists', 'null', 'notnull', 'contains', 'startswith', 'endswith'
      ];

      validOperators.forEach(operator => {
        const condition: FieldCondition = {
          field: 'test',
          operator,
          value: 'test'
        };
        expect(condition.operator).toBe(operator);
      });
    });

    it('should enforce correct join types', () => {
      const validJoinTypes: JoinType[] = [
        'inner', 'left', 'right', 'full',
        'lookup', 'embed', 'many-to-one',
        'one-to-many', 'many-to-many', 'one-to-one'
      ];

      validJoinTypes.forEach(joinType => {
        const join: JoinClause = {
          type: joinType,
          target: 'test',
          on: []
        };
        expect(join.type).toBe(joinType);
      });
    });

    it('should enforce correct aggregation types', () => {
      const validAggregationTypes: AggregationType[] = [
        'count', 'sum', 'avg', 'min', 'max', 'group', 'having', 'distinct'
      ];

      validAggregationTypes.forEach(aggregationType => {
        const aggregation: AggregationClause = {
          type: aggregationType,
          alias: 'test'
        };
        expect(aggregation.type).toBe(aggregationType);
      });
    });
  });
});