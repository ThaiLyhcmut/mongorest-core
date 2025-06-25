# MongoREST Error System Documentation

## Overview
MongoREST sử dụng một hệ thống error có cấu trúc với mã lỗi cụ thể để dễ dàng debug và xử lý lỗi trong production.

## Error Response Format

Tất cả errors đều trả về theo format chuẩn:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "description": "Detailed description of the error",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/endpoint",
    "details": {
      // Additional context-specific details
    },
    "stack": "..." // Only in development mode
  }
}
```

## Error Codes Reference

### Bootstrap Errors (BST_*)
| Code | Status | Description |
|------|--------|-------------|
| BST_CONFIG_REQUIRED | 500 | Configuration object is required for initialization |
| BST_CORE_NOT_INITIALIZED | 500 | Core system must be initialized before use |
| BST_ADAPTER_LIST_FAILED | 503 | Failed to retrieve adapter list from registry |
| BST_INIT_BUILTIN_FAILED | 500 | Failed to initialize with built-in adapters |
| BST_INIT_CONFIG_FAILED | 500 | Failed to initialize with provided configuration |
| BST_TEST_CONNECTION_FAILED | 503 | Failed to test database connections |

### Core Errors (COR_*)
| Code | Status | Description |
|------|--------|-------------|
| COR_ACCESS_DENIED_READ | 403 | User does not have read access to the requested collection |
| COR_QUERY_VALIDATION_FAILED | 400 | Query validation failed against adapter capabilities |
| COR_ADAPTER_CONTEXT_FAILED | 500 | Failed to set adapter context for query execution |
| COR_RBAC_FEATURES_INVALID | 403 | RBAC features must be returned as an array |
| COR_RBAC_FEATURES_FAILED | 500 | Failed to retrieve RBAC features for collection |
| COR_ADAPTER_NOT_FOUND | 404 | No adapter found for the specified database type |
| COR_RELATIONSHIP_NOT_INITIALIZED | 500 | Relationship registry must be initialized |
| COR_JOINS_INVALID_TYPE | 400 | Joins parameter must be an array |
| COR_RELATIONSHIP_NOT_FOUND | 500 | Failed to retrieve relationships for collection |
| COR_QUERY_OBJECT_REQUIRED | 400 | Query object is required for processing |
| COR_COLLECTION_NAME_INVALID | 400 | Valid collection name string is required |
| COR_ROLES_INVALID_TYPE | 403 | Roles parameter must be an array of strings |
| COR_RBAC_RESTRICTION_FAILED | 500 | Failed to apply RBAC field restrictions |

### Query Converter Errors (QRY_*)
| Code | Status | Description |
|------|--------|-------------|
| QRY_CURRENT_QUERY_NOT_INITIALIZED | 400 | Current query context is not initialized |

### Adapter Registry Errors (ADP_*)
| Code | Status | Description |
|------|--------|-------------|
| ADP_MODULE_INVALID | 500 | Invalid adapter module format |
| ADP_IMPLEMENTATION_INVALID | 500 | Invalid adapter implementation |
| ADP_LOAD_FAILED | 500 | Failed to load adapter from specified path |
| ADP_NOT_INITIALIZED | 500 | Adapter must be initialized before use |

### RBAC Validator Errors (RBC_*)
| Code | Status | Description |
|------|--------|-------------|
| RBC_COLLECTION_NOT_FOUND | 400 | Collection not found in RBAC configuration |
| RBC_ACCESS_DENIED | 403 | User does not have required access to perform this action |

## Error Classes

### MongoRESTError (Base Class)
- Base class for all custom errors
- Properties: `code`, `statusCode`, `details`, `timestamp`

### Specific Error Classes
- **ConfigurationError** (500): Configuration-related errors
- **ValidationError** (400): Input validation errors
- **AuthorizationError** (403): Permission/authorization errors
- **AdapterError** (500): Database adapter errors
- **QueryError** (400): Query processing errors
- **RelationshipError** (500): Relationship processing errors
- **NotFoundError** (404): Resource not found errors
- **ConnectionError** (503): Database connection errors

## Usage Examples

### Throwing Errors
```typescript
import { AuthorizationError, ErrorCodes } from './errors';

// Throw with error code
throw new AuthorizationError(ErrorCodes.COR_ACCESS_DENIED_READ, {
  collection: 'users',
  roles: ['viewer']
});
```

### Handling Errors in API
```typescript
import { toErrorResponse } from './errors';

try {
  // API logic
} catch (error) {
  const errorResponse = toErrorResponse(error, isDevelopment, req.path);
  res.status(errorResponse.error.statusCode).json(errorResponse);
}
```

### Checking Error Types
```typescript
import { isMongoRESTError } from './errors';

if (isMongoRESTError(error)) {
  // Handle MongoREST-specific error
  console.log('Error code:', error.code);
}
```

## Best Practices

1. **Always use error codes**: Throw errors with specific error codes rather than custom messages
2. **Include relevant details**: Pass context-specific information in the `details` parameter
3. **Use appropriate error classes**: Choose the right error class based on the type of error
4. **Handle wrapped errors**: Use `wrapError()` for unknown errors to maintain error structure
5. **Log errors appropriately**: Log full error details server-side while returning safe information to clients

## Client-Side Error Handling

```typescript
// Example client-side error handler
async function handleApiCall() {
  try {
    const response = await fetch('/api/crud/users');
    const data = await response.json();
    
    if (!data.success) {
      // Handle error based on code
      switch (data.error.code) {
        case 'COR_ACCESS_DENIED_READ':
          showMessage('You do not have permission to view this data');
          break;
        case 'RBC_COLLECTION_NOT_FOUND':
          showMessage('The requested resource does not exist');
          break;
        default:
          showMessage('An error occurred: ' + data.error.message);
      }
    }
  } catch (error) {
    showMessage('Network error occurred');
  }
}
```

## Monitoring and Debugging

Error codes make it easy to:
- Track specific error types in monitoring systems
- Create alerts for critical errors
- Analyze error patterns
- Debug issues quickly with specific error codes

Example monitoring query:
```sql
SELECT error_code, COUNT(*) as count
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '1 day'
GROUP BY error_code
ORDER BY count DESC;
```
