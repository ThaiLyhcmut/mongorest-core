# Intermediate Query Types Module

## Mô tả
Module định nghĩa các types và interfaces cho intermediate JSON format - định dạng trung gian database-agnostic có thể được dịch sang bất kỳ loại database nào.

## Main Interface: IntermediateQuery

### Core Properties
- `collection` - Collection/table chính được query
- `filter` - Điều kiện lọc
- `select` - Fields cần select/project
- `sort` - Cấu hình sắp xếp
- `pagination` - Cài đặt phân trang
- `joins` - Cấu hình join/relationship
- `aggregations` - Các operation aggregation
- `metadata` - Metadata bổ sung

## Filter System

### FilterCondition
- `operator` - Toán tử logic: 'and', 'or', 'not'
- `conditions` - Field-based conditions
- `nested` - Nested logical conditions

### FieldCondition
- `field` - Tên field
- `operator` - Comparison operator
- `value` - Giá trị so sánh
- `modifiers` - Bổ sung tùy chọn

### ComparisonOperator
Các toán tử so sánh được hỗ trợ:
- **Equality**: eq, neq
- **Comparison**: gt, gte, lt, lte
- **Array**: in, nin
- **String**: like, ilike, regex, contains, startswith, endswith
- **Existence**: exists, null, notnull

## Select System

### SelectClause
- `fields` - Fields cần include (empty = all)
- `exclude` - Fields cần exclude
- `aliases` - Field aliases mapping
- `computed` - Computed fields

### ComputedField
- `alias` - Alias cho computed field
- `expression` - Expression hoặc function
- `type` - Loại computation: 'function', 'expression', 'aggregation'

## Sort System

### SortClause
- `field` - Field để sort
- `direction` - Hướng sort: 'asc', 'desc'
- `nulls` - Xử lý null: 'first', 'last'

## Pagination System

### PaginationClause
- `offset` - Số records bỏ qua
- `limit` - Số records tối đa trả về
- `count` - Có include total count không

## Join System

### JoinClause
- `type` - Loại join
- `target` - Target collection/table
- `alias` - Join alias
- `on` - Join conditions
- `select` - Fields select từ joined table
- `filter` - Filters cho joined table
- `joins` - Nested joins
- `relationship` - Relationship metadata

### JoinType
Các loại join được hỗ trợ:
- **SQL-style**: inner, left, right, full
- **NoSQL-style**: lookup, embed
- **Relationship-based**: many-to-one, one-to-many, many-to-many, one-to-one

### JoinCondition
- `local` - Local field
- `foreign` - Foreign field
- `operator` - Comparison operator

### RelationshipMeta
- `name` - Tên relationship
- `junction` - Junction table info (cho many-to-many)
- `preserveNull` - Có preserve null/empty results

## Aggregation System

### AggregationClause
- `type` - Loại aggregation
- `field` - Field để aggregate
- `alias` - Alias cho result
- `params` - Parameters bổ sung

### AggregationType
- **Basic**: count, sum, avg, min, max
- **Advanced**: group, having, distinct

## Metadata System

### QueryMetadata
- `originalParams` - Original query parameters
- `roles` - User roles cho RBAC
- `source` - Query source/context
- `timestamp` - Timestamp
- `hints` - Performance hints

## Result Format

### IntermediateQueryResult<T>
- `data` - Query data array
- `count` - Total count (nếu requested)
- `metadata` - Execution metadata
- `pagination` - Pagination info

### Execution Metadata
- `executionTime` - Thời gian thực thi (ms)
- `adapter` - Database adapter used
- `query` - Original intermediate query
- `nativeQuery` - Generated native query

### Pagination Info
- `offset`, `limit` - Pagination parameters
- `total` - Total records available
- `hasMore` - Có còn data không

## Chức năng chính
- Database-agnostic query representation
- Complex filter với logical operators
- Flexible select với aliases và computed fields
- Multi-level join support
- Aggregation và grouping
- Rich metadata cho debugging và optimization
- Standardized result format