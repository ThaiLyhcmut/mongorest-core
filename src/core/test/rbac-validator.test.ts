import { RbacValidator } from '../rbac/rbac-validator';
import { RbacJson, RbacCollection, RbacRolePattern } from '../rbac/rbac-interface';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('RbacValidator', () => {
  let validator: RbacValidator;

  const mockRbacConfig: RbacJson = {
    collections: [
      {
        collection_name: 'users',
        rbac_config: {
          read: [
            {
              user_role: 'admin',
              patterns: [
                { id: { type: 'field' } },
                { name: { type: 'field' } },
                { email: { type: 'field' } },
                { profile: { type: 'relation', relate_collection: 'user_profiles' } }
              ]
            },
            {
              user_role: 'user',
              patterns: [
                { id: { type: 'field' } },
                { name: { type: 'field' } }
              ]
            }
          ],
          write: [
            {
              user_role: 'admin',
              patterns: [
                { name: { type: 'field' } },
                { email: { type: 'field' } }
              ]
            }
          ],
          delete: [
            {
              user_role: 'admin',
              patterns: [
                { id: { type: 'field' } }
              ]
            }
          ]
        }
      },
      {
        collection_name: 'posts',
        rbac_config: {
          read: [
            {
              user_role: 'admin',
              patterns: [
                { id: { type: 'field' } },
                { title: { type: 'field' } },
                { content: { type: 'field' } },
                { author: { type: 'relation', relate_collection: 'users' } }
              ]
            },
            {
              user_role: 'user',
              patterns: [
                { id: { type: 'field' } },
                { title: { type: 'field' } }
              ]
            }
          ],
          write: [],
          delete: []
        }
      },
      {
        collection_name: 'user_profiles',
        rbac_config: {
          read: [
            {
              user_role: 'admin',
              patterns: [
                { user_id: { type: 'field' } },
                { bio: { type: 'field' } },
                { avatar: { type: 'field' } }
              ]
            }
          ],
          write: [],
          delete: []
        }
      }
    ]
  };

  beforeEach(() => {
    validator = new RbacValidator();
    
    // Mock file system read
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockRbacConfig));
    
    validator.loadConfig();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load configuration from file', () => {
      const expectedPath = path.join(__dirname, '../../schemas/rbac/mongorestrbacjson.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should parse JSON configuration correctly', () => {
      expect(() => validator.loadConfig()).not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration with new config', () => {
      const newConfig: RbacJson = {
        collections: [
          {
            collection_name: 'test',
            rbac_config: {
              read: [{ user_role: 'test_user', patterns: [{ field1: { type: 'field' } }] }],
              write: [],
              delete: []
            }
          }
        ]
      };

      validator.updateConfig(newConfig);
      
      // Test that the new config is being used
      expect(validator.hasAccess('test', 'read', ['test_user'])).toBe(true);
    });
  });

  describe('hasAccess', () => {
    it('should return true for admin user accessing users collection', () => {
      const result = validator.hasAccess('users', 'read', ['admin']);
      expect(result).toBe(true);
    });

    it('should return true for regular user accessing users collection', () => {
      const result = validator.hasAccess('users', 'read', ['user']);
      expect(result).toBe(true);
    });

    it('should return false for regular user trying to write to users collection', () => {
      const result = validator.hasAccess('users', 'write', ['user']);
      expect(result).toBe(false);
    });

    it('should return false for non-existent collection', () => {
      const result = validator.hasAccess('non_existent', 'read', ['admin']);
      expect(result).toBe(false);
    });

    it('should return true for user with multiple roles where at least one has access', () => {
      const result = validator.hasAccess('users', 'read', ['guest', 'user']);
      expect(result).toBe(true);
    });

    it('should return false for user with no valid roles', () => {
      const result = validator.hasAccess('users', 'read', ['guest']);
      expect(result).toBe(false);
    });

    it('should handle delete action correctly', () => {
      const adminResult = validator.hasAccess('users', 'delete', ['admin']);
      const userResult = validator.hasAccess('users', 'delete', ['user']);
      
      expect(adminResult).toBe(true);
      expect(userResult).toBe(false);
    });
  });

  describe('getRbacFeatures', () => {
    it('should return allowed fields for admin user', () => {
      const features = validator.getRbacFeatures('users', 'read', ['admin']);
      
      expect(features).toContain('id');
      expect(features).toContain('name');
      expect(features).toContain('email');
      expect(features.length).toBeGreaterThan(0);
    });

    it('should return limited fields for regular user', () => {
      const features = validator.getRbacFeatures('users', 'read', ['user']);
      
      expect(features).toContain('id');
      expect(features).toContain('name');
      expect(features).not.toContain('email');
    });

    it('should handle relational fields', () => {
      const features = validator.getRbacFeatures('users', 'read', ['admin']);
      
      expect(features.some(f => f.startsWith('profile.'))).toBe(true);
    });

    it('should throw error for non-existent collection', () => {
      expect(() => {
        validator.getRbacFeatures('non_existent', 'read', ['admin']);
      }).toThrow('Collection non_existent not found in RBAC configuration');
    });

    it('should handle multiple user roles', () => {
      const features = validator.getRbacFeatures('users', 'read', ['user', 'admin']);
      
      expect(features).toContain('id');
      expect(features).toContain('name');
      expect(features).toContain('email'); // Should include admin fields
    });

    it('should prevent infinite recursion with layer limit', () => {
      // Create a circular reference scenario
      const circularConfig: RbacJson = {
        collections: [
          {
            collection_name: 'test1',
            rbac_config: {
              read: [
                {
                  user_role: 'admin',
                  patterns: [
                    { field1: { type: 'field' } },
                    { test2_ref: { type: 'relation', relate_collection: 'test2' } }
                  ]
                }
              ],
              write: [],
              delete: []
            }
          },
          {
            collection_name: 'test2',
            rbac_config: {
              read: [
                {
                  user_role: 'admin',
                  patterns: [
                    { field2: { type: 'field' } },
                    { test1_ref: { type: 'relation', relate_collection: 'test1' } }
                  ]
                }
              ],
              write: [],
              delete: []
            }
          }
        ]
      };

      validator.updateConfig(circularConfig);
      
      // Should not cause infinite recursion due to layer limit
      expect(() => {
        const features = validator.getRbacFeatures('test1', 'read', ['admin']);
        expect(features).toBeDefined();
        expect(features.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should handle related collections correctly', () => {
      const features = validator.getRbacFeatures('posts', 'read', ['admin']);
      
      expect(features).toContain('id');
      expect(features).toContain('title');
      expect(features).toContain('content');
      expect(features.some(f => f.startsWith('author.'))).toBe(true);
    });

    it('should filter features correctly with pre_fieldName', () => {
      const features = validator.getRbacFeatures('user_profiles', 'read', ['admin'], true, 1, 'profile');
      
      expect(features.every(f => f.startsWith('profile.'))).toBe(true);
    });
  });

  describe('filterRbacFeatures', () => {
    it('should filter allowed features for admin user', () => {
      const requestedFeatures = ['id', 'name', 'email', 'password'];
      const allowedFeatures = RbacValidator.filterRbacFeatures('users', 'read', ['admin'], requestedFeatures);
      
      expect(allowedFeatures).toContain('id');
      expect(allowedFeatures).toContain('name');
      expect(allowedFeatures).toContain('email');
      expect(allowedFeatures).not.toContain('password'); // Not in RBAC config
    });

    it('should filter allowed features for regular user', () => {
      const requestedFeatures = ['id', 'name', 'email'];
      const allowedFeatures = RbacValidator.filterRbacFeatures('users', 'read', ['user'], requestedFeatures);
      
      expect(allowedFeatures).toContain('id');
      expect(allowedFeatures).toContain('name');
      expect(allowedFeatures).not.toContain('email'); // User role doesn't have access
    });

    it('should return empty array when no features are allowed', () => {
      const requestedFeatures = ['password', 'secret'];
      const allowedFeatures = RbacValidator.filterRbacFeatures('users', 'read', ['user'], requestedFeatures);
      
      expect(allowedFeatures).toEqual([]);
    });

    it('should throw error for non-existent collection', () => {
      expect(() => {
        RbacValidator.filterRbacFeatures('non_existent', 'read', ['admin'], ['field1']);
      }).toThrow('Collection non_existent not found in RBAC configuration');
    });

    it('should handle multiple user roles correctly', () => {
      const requestedFeatures = ['id', 'name', 'email'];
      const allowedFeatures = RbacValidator.filterRbacFeatures('users', 'read', ['user', 'admin'], requestedFeatures);
      
      expect(allowedFeatures).toContain('id');
      expect(allowedFeatures).toContain('name');
      expect(allowedFeatures).toContain('email'); // Admin role provides access
    });
  });

  describe('error handling', () => {
    it('should handle missing patterns gracefully', () => {
      const configWithoutPatterns: RbacJson = {
        collections: [
          {
            collection_name: 'test',
            rbac_config: {
              read: [
                {
                  user_role: 'test_user',
                  patterns: undefined as any
                }
              ],
              write: [],
              delete: []
            }
          }
        ]
      };

      validator.updateConfig(configWithoutPatterns);
      
      const features = validator.getRbacFeatures('test', 'read', ['test_user']);
      expect(features).toEqual([]);
    });

    it('should handle empty collections array', () => {
      const emptyConfig: RbacJson = {
        collections: []
      };

      validator.updateConfig(emptyConfig);
      
      expect(validator.hasAccess('any', 'read', ['any'])).toBe(false);
    });
  });
});