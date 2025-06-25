# New Core Module

## Mô tả
Kiến trúc core mới với sự phân tách rõ ràng các mối quan tâm. Đây là module chính xử lý query, validation, và thực thi truy vấn trên nhiều loại database.

## Class: NewCore

### Thuộc tính
- `queryConverter` - Chuyển đổi query parameters
- `rbacValidator` - Validation RBAC (Role-Based Access Control)
- `adapterRegistry` - Registry quản lý database adapters
- `relationshipRegistry` - Registry quản lý relationships

### Phương thức chính

#### processQuery<T>(params, collection, roles, databaseType, adapterName?)
Phương thức xử lý query chính:
1. Validate RBAC access
2. Convert URL params to intermediate JSON
3. Enhance query with relationships
4. Apply RBAC field restrictions
5. Get appropriate database adapter
6. Validate query against adapter capabilities
7. Convert to native database query
8. Execute query

#### getSupportedDatabaseTypes()
Trả về danh sách database types được hỗ trợ

#### getAdapterInfo(databaseType?)
Lấy thông tin adapter

#### testConnection(databaseType, adapterName?)
Test kết nối adapter

#### initialize(config)
Khởi tạo core với cấu hình:
- Khởi tạo adapters
- Load relationship registry
- Update RBAC configuration

#### registerAdapter(adapter)
Đăng ký adapter mới

#### unregisterAdapter(name, version?)
Hủy đăng ký adapter

#### convertToIntermediate(params, collection, roles)
Chuyển đổi query sang intermediate format (cho debugging)

#### convertToNative(intermediateQuery, databaseType, adapterName?)
Chuyển đổi intermediate query sang native format (cho debugging)

### Phương thức private

#### getAdapter(databaseType, adapterName?)
Lấy database adapter phù hợp

#### enhanceQueryWithRelationships(query)
Nâng cao query với thông tin relationship

#### enhanceJoinsRecursively(joins, sourceCollection)
Nâng cao joins một cách đệ quy

#### applyRbacRestrictions(query, collection, roles)
Áp dụng giới hạn RBAC

## Interface: CoreConfig

### Thuộc tính
- `adapters` - Cấu hình database adapters
- `relationships` - Định nghĩa relationships
- `rbac` - Cấu hình RBAC
- `performance` - Cài đặt performance
- `security` - Cài đặt security

## Functions

### createCore(relationshipRegistry?, config?)
Factory function tạo core instance

## Chức năng chính
- Xử lý query từ URL parameters
- Validation RBAC
- Chuyển đổi query sang intermediate format
- Hỗ trợ relationships và joins
- Thực thi query trên nhiều database types
- Quản lý adapter lifecycle