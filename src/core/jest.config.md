# Jest Configuration

## Mô tả
File cấu hình Jest cho việc testing trong module core. Định nghĩa các thiết lập cho TypeScript testing, coverage reporting, và test environment.

## Cấu hình chính

### Basic Configuration
- `preset: 'ts-jest'` - Sử dụng TypeScript preset
- `testEnvironment: 'node'` - Môi trường test Node.js
- `roots: ['<rootDir>']` - Thư mục gốc cho test

### Test Matching
- `testMatch` - Pattern tìm test files:
  - `**/test/**/*.test.ts` - Tất cả .test.ts trong thư mục test
  - `**/?(*.)+(spec|test).ts` - Tất cả .spec.ts hoặc .test.ts

### Transform
- `transform: { '^.+\\.ts$': 'ts-jest' }` - Transform TypeScript files

### Coverage Configuration
- `collectCoverageFrom` - Collect coverage từ:
  - Tất cả .ts files
  - Loại trừ .d.ts, test files, mocks, jest.config.js, node_modules
- `coverageDirectory: 'coverage'` - Thư mục output coverage
- `coverageReporters: ['text', 'lcov', 'html']` - Các format report

### Coverage Thresholds
- `coverageThreshold.global` - Ngưỡng coverage tối thiểu:
  - `branches: 70%`
  - `functions: 70%`
  - `lines: 70%`
  - `statements: 70%`

### Other Settings
- `setupFilesAfterEnv: ['<rootDir>/test/setup.ts']` - Setup file
- `testTimeout: 10000` - Timeout 10 giây
- `verbose: true` - Hiển thị chi tiết
- `collectCoverage: true` - Bật coverage collection

## Chức năng chính
- Cấu hình TypeScript testing
- Coverage reporting với ngưỡng quality gates
- Setup test environment
- Ignore patterns cho test files