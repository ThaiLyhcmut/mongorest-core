# Adapter Registry Module

## Mô tả
Registry quản lý tất cả database adapters trong hệ thống. Cung cấp singleton pattern để đăng ký, tìm kiếm, và quản lý lifecycle của các adapters.

## Class: AdapterRegistry

### Singleton Pattern
- `getInstance()` - Lấy singleton instance
- Private constructor để đảm bảo single instance

### Adapter Management

#### register(adapter)
Đăng ký adapter mới:
- Tạo unique key với name@version
- Update type mapping
- Tránh duplicate registration

#### unregister(name, version?)
Hủy đăng ký adapter:
- Support version cụ thể hoặc latest
- Update type mapping
- Cleanup resources

#### getAdapter(name, version?)
Lấy adapter theo name và version:
- Tự động tìm latest version nếu không chỉ định
- Trả về null nếu không tìm thấy

#### getAdapterByType(type, preferredName?)
Lấy adapter theo database type:
- Ưu tiên adapter có tên được chỉ định
- Fallback về latest version available

### Query Methods

#### listAdapters()
Liệt kê tất cả adapters với thông tin:
- Key, name, type, version
- Capabilities của adapter

#### listAdaptersByType(type)
Liệt kê adapters theo database type

#### hasAdapter(name, version?)
Kiểm tra adapter có tồn tại

#### supportsType(type)
Kiểm tra database type có được hỗ trợ

#### getSupportedTypes()
Lấy danh sách database types được hỗ trợ

### Lifecycle Management

#### initializeAll(configs)
Khởi tạo tất cả adapters với configs

#### disposeAll()
Dispose tất cả adapters

#### clear()
Xóa tất cả adapters

### Version Management
- `compareVersions(a, b)` - So sánh semantic versions
- `findLatestVersion(name)` - Tìm latest version của adapter
- `findLatestVersionForType(type)` - Tìm latest version cho database type

## Class: AdapterPluginSystem

### Dynamic Loading

#### loadAdapter(modulePath)
Load adapter từ module path:
- Dynamic import module
- Validate adapter implementation
- Register vào registry

#### loadAdaptersFromDirectory(directory)
Load tất cả adapters từ directory:
- Scan .js và .ts files
- Load từng adapter
- Handle errors gracefully

#### loadAdaptersFromConfig(config)
Load adapters từ configuration:
- Support path hoặc package name
- Handle required vs optional adapters

### Validation

#### isValidAdapter(obj)
Validate adapter implementation:
- Kiểm tra required properties
- Kiểm tra required methods
- Type checking

## Interfaces

### AdapterInfo
Thông tin adapter:
- `key` - Unique key
- `name`, `type`, `version`
- `capabilities`

### AdapterPluginConfig
Cấu hình plugin loading:
- `path` - Đường dẫn module
- `package` - Package name
- `required` - Bắt buộc hay không
- `config` - Custom configuration

## Export

### adapterRegistry
Singleton instance của AdapterRegistry để sử dụng toàn ứng dụng

## Chức năng chính
- Quản lý tập trung tất cả database adapters
- Version management với semantic versioning
- Dynamic loading adapters từ files/packages
- Type-based adapter discovery
- Lifecycle management cho adapters