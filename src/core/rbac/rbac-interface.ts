export interface RbacJson {
  name?: string;
  version?: string;
  description?: string;
  collections: RbacCollection[];
  rbac_features?: RbacFeatures;
}

export interface RbacCollection {
  collection_name: string;
  rbac_config: RbacConfig;
}

export interface RbacConfig {
  read: RbacRolePattern[];
  write: RbacRolePattern[];
  delete: RbacRolePattern[];
}

export interface RbacRolePattern {
  user_role: string;
  patterns: RbacPattern[];
}

export type RbacPattern =
  | { [field: string]: { type: "field" } }
  | { [field: string]: { type: "relation", relate_collection: string } }

export interface RbacFeatures {
  pattern_syntax: {
    field: string;
    relation: { relation: string };
    all_fields: string;
  };
  permission_inheritance: {
    enabled: boolean;
    hierarchy: string[];
  };
  dynamic_permissions: {
    enabled: boolean;
    context_aware: boolean;
    runtime_evaluation: boolean;
  };
}