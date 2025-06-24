import { RelationshipRegistry } from '../adapters/base/relationship/RelationshipRegistry';
import { OneToOneRelationship } from '../adapters/base/relationship/oneToOneRelationship';
import { OneToManyRelationship } from '../adapters/base/relationship/oneToManyRelationship';
import { ManyToOneRelationship } from '../adapters/base/relationship/manyToOneRelationship';
import { ManyToManyRelationship } from '../adapters/base/relationship/manyToManyRelationship';
import { RelationshipDefinition } from '../adapters/base/relationship/types';

describe('RelationshipRegistry', () => {
  let registry: RelationshipRegistry;

  beforeEach(() => {
    registry = new RelationshipRegistry();
  });

  describe('relationship registration', () => {
    it('should register a relationship instance', () => {
      const definition: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };
      
      const relationship = new OneToOneRelationship(definition);
      registry.register('users', relationship);

      expect(registry.has('users', 'profile')).toBe(true);
      expect(registry.get('users', 'profile')).toBe(relationship);
    });

    it('should register relationship from definition - one-to-one', () => {
      const definition: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };

      registry.registerFromDefinition('users', definition);

      expect(registry.has('users', 'profile')).toBe(true);
      const relationship = registry.get('users', 'profile');
      expect(relationship).toBeInstanceOf(OneToOneRelationship);
    });

    it('should register relationship from definition - one-to-many', () => {
      const definition: RelationshipDefinition = {
        name: 'posts',
        type: 'one-to-many',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'posts'
      };

      registry.registerFromDefinition('users', definition);

      expect(registry.has('users', 'posts')).toBe(true);
      const relationship = registry.get('users', 'posts');
      expect(relationship).toBeInstanceOf(OneToManyRelationship);
    });

    it('should register relationship from definition - many-to-one', () => {
      const definition: RelationshipDefinition = {
        name: 'user',
        type: 'many-to-one',
        localField: 'user_id',
        foreignField: 'id',
        targetTable: 'users'
      };

      registry.registerFromDefinition('posts', definition);

      expect(registry.has('posts', 'user')).toBe(true);
      const relationship = registry.get('posts', 'user');
      expect(relationship).toBeInstanceOf(ManyToOneRelationship);
    });

    it('should register relationship from definition - many-to-many', () => {
      const definition: RelationshipDefinition = {
        name: 'roles',
        type: 'many-to-many',
        localField: 'id',
        foreignField: 'id',
        targetTable: 'roles',
        junction: {
          table: 'user_roles',
          localKey: 'user_id',
          foreignKey: 'role_id'
        }
      };

      registry.registerFromDefinition('users', definition);

      expect(registry.has('users', 'roles')).toBe(true);
      const relationship = registry.get('users', 'roles');
      expect(relationship).toBeInstanceOf(ManyToManyRelationship);
    });

    it('should throw error for unknown relationship type', () => {
      const definition = {
        name: 'unknown',
        type: 'unknown-type',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'unknown'
      } as any;

      expect(() => {
        registry.registerFromDefinition('users', definition);
      }).toThrow('Unknown relationship type: unknown-type');
    });
  });

  describe('relationship retrieval', () => {
    beforeEach(() => {
      const profileDef: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };

      const postsDef: RelationshipDefinition = {
        name: 'posts',
        type: 'one-to-many',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'posts'
      };

      registry.registerFromDefinition('users', profileDef);
      registry.registerFromDefinition('users', postsDef);
    });

    it('should get specific relationship', () => {
      const relationship = registry.get('users', 'profile');
      expect(relationship).toBeDefined();
      expect(relationship?.name).toBe('profile');
    });

    it('should return undefined for non-existent relationship', () => {
      const relationship = registry.get('users', 'non-existent');
      expect(relationship).toBeUndefined();
    });

    it('should get all relationships for a table', () => {
      const relationships = registry.getForTable('users');
      expect(relationships).toHaveLength(2);
      expect(relationships.map(r => r.name)).toContain('profile');
      expect(relationships.map(r => r.name)).toContain('posts');
    });

    it('should return empty array for table with no relationships', () => {
      const relationships = registry.getForTable('unknown_table');
      expect(relationships).toEqual([]);
    });

    it('should get relationships using alias method', () => {
      const relationships = registry.getRelationships('users');
      expect(relationships).toHaveLength(2);
    });
  });

  describe('relationship existence and removal', () => {
    beforeEach(() => {
      const definition: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };

      registry.registerFromDefinition('users', definition);
    });

    it('should check if relationship exists', () => {
      expect(registry.has('users', 'profile')).toBe(true);
      expect(registry.has('users', 'non-existent')).toBe(false);
    });

    it('should remove relationship', () => {
      const removed = registry.remove('users', 'profile');
      expect(removed).toBe(true);
      expect(registry.has('users', 'profile')).toBe(false);
    });

    it('should return false when removing non-existent relationship', () => {
      const removed = registry.remove('users', 'non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all relationships', () => {
      expect(registry.has('users', 'profile')).toBe(true);
      
      registry.clear();
      
      expect(registry.has('users', 'profile')).toBe(false);
      expect(registry.getForTable('users')).toEqual([]);
    });
  });

  describe('bulk operations', () => {
    it('should register multiple relationships from bulk definition', () => {
      const definitions = {
        users: [
          {
            name: 'profile',
            type: 'one-to-one',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'user_profiles'
          },
          {
            name: 'posts',
            type: 'one-to-many',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'posts'
          }
        ],
        posts: [
          {
            name: 'user',
            type: 'many-to-one',
            localField: 'user_id',
            foreignField: 'id',
            targetTable: 'users'
          },
          {
            name: 'comments',
            type: 'one-to-many',
            localField: 'id',
            foreignField: 'post_id',
            targetTable: 'comments'
          }
        ]
      };

      registry.registerBulk(definitions);

      // Check users relationships
      expect(registry.has('users', 'profile')).toBe(true);
      expect(registry.has('users', 'posts')).toBe(true);
      expect(registry.getForTable('users')).toHaveLength(2);

      // Check posts relationships
      expect(registry.has('posts', 'user')).toBe(true);
      expect(registry.has('posts', 'comments')).toBe(true);
      expect(registry.getForTable('posts')).toHaveLength(2);
    });

    it('should get all relationships', () => {
      const definitions = {
        users: [
          {
            name: 'profile',
            type: 'one-to-one',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'user_profiles'
          }
        ],
        posts: [
          {
            name: 'user',
            type: 'many-to-one',
            localField: 'user_id',
            foreignField: 'id',
            targetTable: 'users'
          }
        ]
      };

      registry.registerBulk(definitions);

      const allRelationships = registry.getAll();
      expect(allRelationships.size).toBe(2);
      expect(allRelationships.has('users.profile')).toBe(true);
      expect(allRelationships.has('posts.user')).toBe(true);
    });

    it('should list all relationships by table', () => {
      const definitions = {
        users: [
          {
            name: 'profile',
            type: 'one-to-one',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'user_profiles'
          },
          {
            name: 'posts',
            type: 'one-to-many',
            localField: 'id',
            foreignField: 'user_id',
            targetTable: 'posts'
          }
        ]
      };

      registry.registerBulk(definitions);

      const listedRelationships = registry.listAllRelationships();
      expect(listedRelationships).toHaveProperty('users');
      expect(listedRelationships.users).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty bulk definitions', () => {
      expect(() => {
        registry.registerBulk({});
      }).not.toThrow();
    });

    it('should handle bulk definitions with empty relationship arrays', () => {
      expect(() => {
        registry.registerBulk({
          users: [],
          posts: []
        });
      }).not.toThrow();
    });

    it('should handle relationship names with special characters', () => {
      const definition: RelationshipDefinition = {
        name: 'user-profile_data',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };

      registry.registerFromDefinition('users', definition);

      expect(registry.has('users', 'user-profile_data')).toBe(true);
    });

    it('should handle relationships with same name but different tables', () => {
      const userProfileDef: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'user_id',
        targetTable: 'user_profiles'
      };

      const adminProfileDef: RelationshipDefinition = {
        name: 'profile',
        type: 'one-to-one',
        localField: 'id',
        foreignField: 'admin_id',
        targetTable: 'admin_profiles'
      };

      registry.registerFromDefinition('users', userProfileDef);
      registry.registerFromDefinition('admins', adminProfileDef);

      expect(registry.has('users', 'profile')).toBe(true);
      expect(registry.has('admins', 'profile')).toBe(true);
      
      const userProfile = registry.get('users', 'profile');
      const adminProfile = registry.get('admins', 'profile');
      
      expect(userProfile?.targetTable).toBe('user_profiles');
      expect(adminProfile?.targetTable).toBe('admin_profiles');
    });
  });
});