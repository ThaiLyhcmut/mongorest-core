# Bootstrap Module

## Mô tả
Module khởi tạo và cấu hình hệ thống core với tất cả database adapters. Cung cấp các phương thức để bootstrap hệ thống với các adapter tích hợp sẵn hoặc custom adapter.

## Class: CoreBootstrap

### Thuộc tính
- `core` - Instance của NewCore
- `pluginSystem` - Hệ thống plugin cho adapter
- `relationshipRegistry` - Registry quản lý relationships

### Phương thức chính

#### initializeWithBuiltinAdapters(config?)
Khởi tạo hệ thống với các adapter tích hợp:
- MongoDB Adapter
- PostgreSQL Adapter
- Elasticsearch Adapter
- MySQL Adapter

#### initializeWithConfig(config)
Khởi tạo hệ thống với cấu hình tùy chỉnh:
- Load custom adapters
- Setup relationships
- Cấu hình core system

#### getCore()
Trả về instance của core đã khởi tạo

#### getStatus()
Lấy trạng thái hệ thống:
- Danh sách adapters đã đăng ký
- Relationships
- Các loại database được hỗ trợ

#### testConnections()
Test kết nối tất cả adapters

## Interfaces

### BootstrapConfig
- `includeBuiltinAdapters` - Có bao gồm adapter tích hợp sẵn
- `customAdapters` - Cấu hình adapter tùy chỉnh
- `relationships` - Định nghĩa relationships
- `core` - Cấu hình core

### CustomAdapterConfig
- `path` - Đường dẫn đến adapter module
- `instance` - Instance của adapter
- `required` - Adapter có bắt buộc không

## Functions

### createCoreSystem(config?)
Factory function để tạo core system

### quickStart(databaseConfigs?)
Quick start với cấu hình tối thiểu

## Chức năng chính
- Bootstrap và khởi tạo hệ thống
- Quản lý adapter registration
- Test kết nối database
- Cung cấp system status