# Database Adapter Base Module

## Mô tả
Module định nghĩa interface và abstract class cho tất cả database adapters. Cung cấp cấu trúc chuẩn để implement các adapter cho different database types.

## Interface: DatabaseAdapter

### Thuộc tính bắt buộc
- `name` - Tên adapter
- `type` - Loại database
- `version` - Phiên bản adapter

### Phương thức bắt buộc

#### convertQuery(query)
Chuyển đổi intermediate query sang native database query

#### executeQuery<T>(nativeQuery, options?)
Thực thi query đã chuyển đổi

#### validateQuery(query)
Validate intermediate query có được hỗ trợ không

#### getCapabilities()
Trả về capabilities của adapter

#### initialize(config)
Khởi tạo adapter với cấu hình

#### dispose()
Cleanup adapter resources

#### testConnection()
Test kết nối database

## Types

### DatabaseType
Các loại database được hỗ trợ:
- `mongodb`, `postgresql`, `mysql`, `elasticsearch`
- `redis`, `sqlite`, `oracle`, `custom`, `mock`

### ExecutionOptions
- `timeout` - Request timeout
- `raw` - Trả về raw results
- `transaction` - Transaction context
- `driverOptions` - Driver-specific options

### ValidationResult
- `valid` - Query có hợp lệ
- `errors` - Danh sách validation errors
- `warnings` - Danh sách warnings

### AdapterCapabilities
- `filterOperators` - Operators được hỗ trợ
- `joinTypes` - Join types được hỗ trợ
- `aggregations` - Aggregation functions
- `fullTextSearch` - Hỗ trợ full-text search
- `transactions` - Hỗ trợ transactions
- `nestedQueries` - Hỗ trợ nested queries
- `maxComplexity` - Độ phức tạp tối đa
- `maxResultSize` - Kích thước kết quả tối đa

## Abstract Class: BaseDatabaseAdapter

### Chức năng được implement sẵn

#### validateQuery(query)
Validation cơ bản:
- Kiểm tra collection name
- Validate filter operators với capabilities
- Validate join types với capabilities

#### initialize(config)
Khởi tạo cơ bản với config

#### dispose()
Cleanup cơ bản

#### createResult<T>(data, query, nativeQuery, executionTime?)
Tạo chuẩn hóa kết quả với metadata và pagination info

### Phương thức utility

#### ensureInitialized()
Đảm bảo adapter đã được khởi tạo

#### validateFilterOperators(filter, capabilities, errors)
Validate recursive filter operators

## Interfaces Configuration

### AdapterConfig
- `connection` - Cấu hình kết nối
- `performance` - Cài đặt performance
- `security` - Cài đặt security
- `custom` - Cài đặt custom

### ConnectionConfig
- `host`, `port`, `database` - Thông tin kết nối
- `username`, `password` - Credentials
- `connectionString` - Connection string
- `pool` - Connection pool settings
- `ssl` - SSL configuration

## Chức năng chính
- Định nghĩa interface chuẩn cho database adapters
- Validation query với adapter capabilities
- Chuẩn hóa configuration và connection
- Base implementation cho common functionalities