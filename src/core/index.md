# Core Index Module

## Mô tả
File này định nghĩa các interface chính cho hệ thống query của MongoRest, cung cấp cấu trúc dữ liệu tiêu chuẩn để xử lý các tham số query và kết quả trả về.

## Interfaces

### QueryParams
Định nghĩa tham số query từ URL request:
- `[key: string]: string | string[]` - Cho phép tham số có thể là string hoặc mảng string

### MongoQuery
Định nghĩa cấu trúc query cho MongoDB:
- `filter` - Điều kiện lọc dữ liệu
- `projection` - Chọn trường dữ liệu cần trả về
- `sort` - Sắp xếp kết quả
- `pipeline` - Aggregation pipeline
- `hasEmbeds` - Có nhúng dữ liệu từ collection khác
- `embeddedTables` - Danh sách bảng được nhúng
- `limit` - Giới hạn số lượng kết quả
- `skip` - Bỏ qua số lượng kết quả
- `count` - Có đếm tổng số kết quả

### ParsedFilter
Định nghĩa filter đã được parse:
- `field` - Tên trường
- `operator` - Toán tử so sánh
- `value` - Giá trị so sánh
- `modifier` - Bổ sung tùy chọn

### ConvertOptions
Tùy chọn chuyển đổi query:
- `collection` - Tên collection (bắt buộc cho embeds)
- `enableEmbeds` - Bật tính năng nhúng dữ liệu
- `maxEmbedDepth` - Độ sâu tối đa khi nhúng dữ liệu

## Chức năng chính
- Cung cấp type definitions cho hệ thống query
- Hỗ trợ MongoDB aggregation pipeline
- Quản lý embedded relationships
- Pagination và counting