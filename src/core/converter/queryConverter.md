# Query Converter Module

## Mô tả
Module chuyển đổi URL query parameters thành intermediate JSON format. Hỗ trợ parsing các toán tử logic, embedded relationships, và các tham số đặc biệt.

## Class: QueryConverter

### Constructor
- `constructor(relationshipRegistry?)` - Nhận relationship registry để xử lý embeds

### Main Method

#### convert(params, collection, roles)
Chuyển đổi chính từ QueryParams sang IntermediateQuery:
1. Tạo base query với metadata
2. Process từng parameter
3. Handle special parameters
4. Handle logical operators
5. Handle field filters

### Parameter Processing

#### Special Parameters
- `select` - Chọn fields cần trả về
- `order` - Sắp xếp kết quả
- `limit` - Giới hạn số lượng
- `skip/offset` - Bỏ qua số lượng
- `count` - Đếm tổng số

#### Logical Operators
- `and`, `or`, `not` - Toán tử logic
- Support nested conditions
- Parse complex expressions

### Select Parsing

#### parseSelect(selectClause)
Parse select clause với support:
- Regular fields
- Field aliases (alias:field)
- Embedded relationships
- Computed fields

#### Embed Processing
- `isEmbedExpression(token)` - Detect embed expressions
- `parseEmbedToJoin(embedExpr)` - Convert embed to join clause
- `parseNestedJoinsAndFilters(innerExpr, parentTable)` - Parse nested relationships

### Filter Parsing

#### Field Conditions
- Parse format: `field.operator.value`
- Support array values: `field.in.(value1,value2)`
- Handle special values: null, boolean, numbers

#### Logical Conditions
- Parse complex logical expressions
- Support nested parentheses
- Handle quoted values

### Sort Parsing

#### parseSort(orderClause)
Parse order clause:
- Support multiple fields: `field1,-field2`
- `-` prefix for descending order
- Default ascending order

### Value Parsing

#### parseValue(valueStr)
Parse string values to appropriate types:
- `null` → null
- `true/false` → boolean
- Numbers → integer/float
- Quoted strings → string
- Default → string

### Utility Methods

#### tokenizeSelect(expression)
Tokenize select expression với:
- Respect nested parentheses
- Handle quoted strings
- Split by commas at correct depth

#### parseLogicalValue(value)
Parse logical operator values:
- Remove outer parentheses
- Split by comma respecting nesting
- Handle quoted strings

#### parseRegularField(token)
Parse regular field tokens:
- Handle aliases with `:`
- Handle JSON paths with `->`
- Handle casting with `::`

## Features

### Supported Operators
- **Comparison**: eq, neq, gt, gte, lt, lte
- **Array**: in, nin
- **String**: like, ilike, regex, contains, startswith, endswith
- **Existence**: exists, null, notnull

### Embedded Relationships
- Parse embed expressions: `relationship(filters)`
- Convert to join clauses
- Support nested embeds
- Apply filters to joined data

### Complex Queries
- Logical combinations with AND/OR/NOT
- Nested conditions với parentheses
- Field aliases và computed fields
- Pagination với limit/offset

## Chức năng chính
- Convert URL query parameters to intermediate format
- Support complex logical expressions
- Handle embedded relationships as joins
- Parse special parameters (select, order, pagination)
- Type-safe value parsing
- Nested query support