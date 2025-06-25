# RBAC Validator Module

## Mô tả
Module validation Role-Based Access Control (RBAC) cho hệ thống. Quản lý quyền truy cập dựa trên role của user và collection, bao gồm field-level permissions.

## Class: RbacValidator

### Configuration Management

#### loadConfig()
Load RBAC configuration từ file:
- Đọc từ `../../schemas/rbac/mongorestrbacjson.json`
- Parse JSON configuration
- Set static rbacJson

#### updateConfig(config)
Cập nhật configuration programmatically

### Access Control

#### hasAccess(collection, action, userRoles)
Kiểm tra user có quyền truy cập collection:
- `collection` - Tên collection
- `action` - Hành động: 'read', 'write', 'delete'
- `userRoles` - Mảng roles của user
- Return: boolean indicating access

### Field-Level Permissions

#### getRbacFeatures(collection, action, userRoles, isRelate?, layer?, pre_fieldName?)
Lấy danh sách fields user được phép truy cập:
- Support recursive relationships (max 2 layers)
- Handle nested field permissions
- Filter duplicate và overlapping fields
- Return sorted field list

#### filterRbacFeatures(collection, action, userRoles, features)
Filter danh sách features theo RBAC permissions:
- Static method
- Check từng feature với user roles
- Return filtered feature list

### Utility Methods

#### hasUserRole(rolePatterns, userRole)
Kiểm tra user có role trong role patterns:
- Private static method
- Support multiple role patterns
- Return boolean

## RBAC Configuration Structure

### RbacJson
Root configuration object:
- `collections` - Array of collection configurations

### RbacCollection
Configuration cho từng collection:
- `collection_name` - Tên collection
- `rbac_config` - RBAC configuration

### RBAC Config
Permissions cho các actions:
- `read` - Read permissions
- `write` - Write permissions  
- `delete` - Delete permissions

### RbacRolePattern
Role-based permission pattern:
- `user_role` - Tên role
- `patterns` - Array of field patterns

### RbacPattern
Field permission pattern:
- `[fieldName]` - Field name làm key
- `type` - 'field' hoặc 'relation'
- `relate_collection` - Collection được relate (nếu type là 'relation')

## Features

### Multi-Level Access Control
- Collection-level permissions
- Field-level permissions
- Relationship-level permissions

### Role Management
- Multiple roles per user
- Role-based pattern matching
- Hierarchical permission checking

### Relationship Support
- Recursive relationship permissions (max 2 layers)
- Cross-collection field access
- Nested field permission resolution

### Field Filtering
- Automatic field filtering based on permissions
- Duplicate removal
- Overlapping field optimization

## Use Cases

### Read Operations
- Check collection read access
- Get allowed fields for projection
- Filter results based on field permissions

### Write Operations
- Validate write permissions
- Check field-level write access
- Enforce relationship constraints

### Security
- Prevent unauthorized data access
- Field-level data protection
- Role-based data filtering

## Chức năng chính
- Role-based access control validation
- Field-level permission management
- Recursive relationship permission handling
- Configuration-driven security
- Multi-action permission support (read/write/delete)