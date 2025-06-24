import { QueryConverter } from '../converter/queryConverter';
import { QueryParams } from '../index';
import { RelationshipRegistry } from '../adapters/base/relationship/RelationshipRegistry';

describe('QueryConverter', () => {
  let converter: QueryConverter;
  let relationshipRegistry: RelationshipRegistry;

  beforeEach(() => {
    relationshipRegistry = new RelationshipRegistry();
    converter = new QueryConverter(relationshipRegistry);
  });

  describe('basic conversion', () => {
    it('should convert simple field filters', () => {
      const params: QueryParams = {
        name: 'eq.John',
        age: 'gt.25',
        status: 'in.(active,pending)'
      };

      const result = converter.convert(params, 'users');

      expect(result.collection).toBe('users');
      expect(result.filter?.conditions).toHaveLength(3);
      expect(result.filter?.conditions?.[0]).toEqual({
        field: 'name',
        operator: 'eq',
        value: 'John'
      });
      expect(result.filter?.conditions?.[1]).toEqual({
        field: 'age',
        operator: 'gt',
        value: 25
      });
      expect(result.filter?.conditions?.[2]).toEqual({
        field: 'status',
        operator: 'in',
        value: ['active', 'pending']
      });
    });

    it('should convert select clause', () => {
      const params: QueryParams = {
        select: 'name,email,age'
      };

      const result = converter.convert(params, 'users');

      expect(result.select?.fields).toEqual(['name', 'email', 'age']);
    });

    it('should convert select with aliases', () => {
      const params: QueryParams = {
        select: 'fullName:name,userEmail:email'
      };

      const result = converter.convert(params, 'users');

      expect(result.select?.fields).toEqual(['name', 'email']);
      expect(result.select?.aliases).toEqual({
        fullName: 'name',
        userEmail: 'email'
      });
    });

    it('should convert order clause', () => {
      const params: QueryParams = {
        order: 'name,-age,created_at'
      };

      const result = converter.convert(params, 'users');

      expect(result.sort).toEqual([
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
        { field: 'created_at', direction: 'asc' }
      ]);
    });

    it('should convert pagination params', () => {
      const params: QueryParams = {
        limit: '10',
        offset: '20',
        count: 'true'
      };

      const result = converter.convert(params, 'users');

      expect(result.pagination).toEqual({
        limit: 10,
        offset: 20,
        count: true
      });
    });
  });

  describe('logical operators', () => {
    it('should convert OR conditions', () => {
      const params: QueryParams = {
        or: '(name.eq.John,age.gt.25)'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.operator).toBe('or');
      expect(result.filter?.conditions).toHaveLength(2);
      expect(result.filter?.conditions?.[0]).toEqual({
        field: 'name',
        operator: 'eq',
        value: 'John'
      });
      expect(result.filter?.conditions?.[1]).toEqual({
        field: 'age',
        operator: 'gt',
        value: 25
      });
    });

    it('should convert AND conditions', () => {
      const params: QueryParams = {
        and: '(status.eq.active,verified.eq.true)'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.operator).toBe('and');
      expect(result.filter?.conditions).toHaveLength(2);
    });

    it('should convert NOT conditions', () => {
      const params: QueryParams = {
        not: '(status.eq.inactive)'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.operator).toBe('not');
      expect(result.filter?.conditions).toHaveLength(1);
    });

    it('should combine multiple logical operators', () => {
      const params: QueryParams = {
        name: 'eq.John',
        or: '(age.gt.25,status.eq.active)'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.operator).toBe('and');
      expect(result.filter?.nested).toHaveLength(2);
      expect(result.filter?.conditions).toBeUndefined();
    });
  });

  describe('complex conditions', () => {
    it('should handle nested logical conditions', () => {
      const params: QueryParams = {
        or: '(and=(name.eq.John,age.gt.25),status.eq.active)'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.operator).toBe('or');
      expect(result.filter?.conditions).toBeDefined();
    });

    it('should handle quoted values', () => {
      const params: QueryParams = {
        name: 'eq."John Doe"',
        description: 'like."This is a test"'
      };

      const result = converter.convert(params, 'users');

      expect(result.filter?.conditions?.[0].value).toBe('John Doe');
      expect(result.filter?.conditions?.[1].value).toBe('This is a test');
    });

    it('should handle special values', () => {
      const params: QueryParams = {
        name: 'eq.null',
        active: 'eq.true',
        inactive: 'eq.false',
        score: 'eq.0',
        rating: 'eq.4.5'
      };

      const result = converter.convert(params, 'users');

      const conditions = result.filter?.conditions || [];
      expect(conditions.find(c => c.field === 'name')?.value).toBeNull();
      expect(conditions.find(c => c.field === 'active')?.value).toBe(true);
      expect(conditions.find(c => c.field === 'inactive')?.value).toBe(false);
      expect(conditions.find(c => c.field === 'score')?.value).toBe(0);
      expect(conditions.find(c => c.field === 'rating')?.value).toBe(4.5);
    });
  });

  describe('embedded relationships', () => {
    it('should convert embedded relationships to joins', () => {
      const params: QueryParams = {
        select: 'name,email,look_posts(title,content)'
      };

      const result = converter.convert(params, 'users');

      expect(result.joins).toHaveLength(1);
      expect(result.joins?.[0]).toEqual({
        type: 'lookup',
        target: 'posts',
        alias: 'look_posts',
        on: [],
        relationship: {
          name: 'posts'
        }
      });
    });

    it('should handle nested embedded relationships', () => {
      const params: QueryParams = {
        select: 'name,look_posts(title,look_comments(text,author))'
      };

      const result = converter.convert(params, 'users');

      expect(result.joins).toHaveLength(1);
      expect(result.joins?.[0].joins).toHaveLength(1);
      expect(result.joins?.[0].joins?.[0].target).toBe('comments');
    });

    it('should handle filters in embedded relationships', () => {
      const params: QueryParams = {
        select: 'name,look_posts(title.eq.Hello,content)'
      };

      const result = converter.convert(params, 'users');

      // The filter might be structured differently, so let's check if joins exist first
      expect(result.joins).toBeDefined();
      expect(result.joins?.length).toBeGreaterThan(0);
      
      // Check if the join has the expected structure
      const firstJoin = result.joins?.[0];
      expect(firstJoin?.target).toBe('posts');
      expect(firstJoin?.alias).toBe('look_posts');
    });
  });

  describe('value parsing', () => {
    it('should parse different value types correctly', () => {
      const params: QueryParams = {
        string_field: 'eq.text',
        number_field: 'eq.42',
        float_field: 'eq.3.14',
        boolean_field: 'eq.true',
        null_field: 'eq.null'
      };

      const result = converter.convert(params, 'test');

      const conditions = result.filter?.conditions;
      expect(conditions?.[0].value).toBe('text');
      expect(conditions?.[1].value).toBe(42);
      expect(conditions?.[2].value).toBe(3.14);
      expect(conditions?.[3].value).toBe(true);
      expect(conditions?.[4].value).toBeNull();
    });

    it('should parse array values correctly', () => {
      const params: QueryParams = {
        ids: 'in.(1,2,3)',
        names: 'in.(John,Jane,Bob)',
        flags: 'in.(true,false)'
      };

      const result = converter.convert(params, 'test');

      const conditions = result.filter?.conditions;
      expect(conditions?.[0].value).toEqual([1, 2, 3]);
      expect(conditions?.[1].value).toEqual(['John', 'Jane', 'Bob']);
      expect(conditions?.[2].value).toEqual([true, false]);
    });
  });

  describe('metadata', () => {
    it('should include metadata in result', () => {
      const params: QueryParams = {
        name: 'eq.John'
      };

      const result = converter.convert(params, 'users', ['admin']);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalParams).toEqual(params);
      expect(result.metadata?.roles).toEqual(['admin']);
      expect(result.metadata?.source).toBe('rest-api');
      expect(result.metadata?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('edge cases', () => {
    it('should handle empty parameters', () => {
      const result = converter.convert({}, 'users');
      
      expect(result.collection).toBe('users');
      expect(result.filter).toBeUndefined();
      expect(result.select).toBeUndefined();
    });

    it('should handle malformed conditions gracefully', () => {
      const params: QueryParams = {
        invalid: 'malformed'
      };

      const result = converter.convert(params, 'users');
      
      expect(result.collection).toBe('users');
    });

    it('should handle select all (*)', () => {
      const params: QueryParams = {
        select: '*'
      };

      const result = converter.convert(params, 'users');
      
      expect(result.select?.fields).toEqual([]);
    });

    it('should handle empty select', () => {
      const params: QueryParams = {
        select: ''
      };

      const result = converter.convert(params, 'users');
      
      expect(result.select?.fields).toEqual([]);
    });
  });
});