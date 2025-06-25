# Relationship Registry Module

## Mô tả
Registry quản lý tất cả relationships trong hệ thống. Cung cấp các phương thức để đăng ký, truy vấn, và quản lý relationships giữa các tables/collections.

## Class: RelationshipRegistry

### Thuộc tính
- `relationships` - Map lưu trữ tất cả relationships với key format: `sourceTable.relationshipName`

### Registration Methods

#### register(sourceTable, relationship)
Đăng ký một relationship:
- `sourceTable` - Bảng nguồn
- `relationship` - Instance của Relationship
- Tạo unique key cho relationship

#### registerFromDefinition(sourceTable, definition)
Đăng ký relationship từ definition:
- Tự động tạo relationship instance dựa trên type
- Support tất cả relationship types:
  - `one-to-one` → OneToOneRelationship
  - `one-to-many` → OneToManyRelationship
  - `many-to-one` → ManyToOneRelationship
  - `many-to-many` → ManyToManyRelationship

#### registerBulk(definitions)
Đăng ký bulk relationships từ configuration:
- `definitions` - Object với format: `{ table: [relationshipDefs...] }`
- Lặp qua từng table và đăng ký relationships

### Query Methods

#### get(sourceTable, relationshipName)
Lấy relationship cụ thể:
- Return Relationship instance hoặc undefined

#### getForTable(sourceTable) / getRelationships(sourceTable)
Lấy tất cả relationships của một table:
- Return array of Relationship instances
- Alias method cho compatibility

#### has(sourceTable, relationshipName)
Kiểm tra relationship có tồn tại:
- Return boolean

#### getAll()
Lấy tất cả relationships:
- Return Map copy của relationships

#### listAllRelationships()
List tất cả relationships theo table:
- Return object với format: `{ table: [relationships...] }`
- Useful cho debugging và overview

### Management Methods

#### remove(sourceTable, relationshipName)
Xóa relationship:
- Return boolean indicating success

#### clear()
Xóa tất cả relationships:
- Reset registry về trạng thái rỗng

## Relationship Types Support

### One-to-One
- Relationship 1:1 giữa hai tables
- Mỗi record trong source table có tối đa 1 record trong target table

### One-to-Many  
- Relationship 1:n từ source table
- Một record trong source table có thể có nhiều records trong target table

### Many-to-One
- Relationship n:1 từ source table  
- Nhiều records trong source table có thể reference cùng 1 record trong target table

### Many-to-Many
- Relationship n:n giữa hai tables
- Sử dụng junction table để store relationship

## Key Features

### Dynamic Registration
- Đăng ký relationships at runtime
- Support cả instance và definition-based registration

### Table-based Organization
- Organize relationships theo source table
- Easy lookup relationships của specific table

### Type-safe Relationships
- Auto-create appropriate relationship instance dựa trên type
- Validation relationship definitions

### Bulk Operations
- Support bulk registration từ configuration
- Easy setup multiple relationships

### Management
- Add, remove, query relationships
- Clear registry cho testing/reset

## Use Cases

### Query Enhancement
- Core system dùng để enhance queries với relationship info
- Convert embed expressions thành proper joins

### Schema Management  
- Maintain relationship schema across application
- Centralized relationship definitions

### Development
- Easy setup relationships trong development
- Debug và overview relationship structures

## Integration

### With Core System
- NewCore sử dụng để enhance queries
- Convert embedded relationships thành joins

### With Adapters
- Database adapters access relationships để generate proper queries
- Support database-specific relationship handling

## Chức năng chính
- Centralized relationship management
- Support tất cả relationship types
- Dynamic registration và management
- Integration với query processing
- Bulk configuration support
- Type-safe relationship handling