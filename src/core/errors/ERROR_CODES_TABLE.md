# MongoREST Error Codes Reference Table

## Error Code Format
`MODULE_CONTEXT_ERROR` where:
- `MODULE`: Module prefix (BST, COR, QRY, ADP, RBC)
- `CONTEXT`: Specific context within module
- `ERROR`: Error type

## Complete Error Codes Table

| Error Code | Status | Category | Description |
|------------|--------|----------|-------------|
| **Bootstrap Errors (BST)** |
| `BST_CONFIG_REQUIRED` | 500 | Server Error | Configuration object is required for initialization |
| `BST_CORE_NOT_INITIALIZED` | 500 | Server Error | Core system must be initialized before use |
| `BST_ADAPTER_LIST_FAILED` | 503 | Service Unavailable | Failed to retrieve adapter list from registry |
| `BST_INIT_BUILTIN_FAILED` | 500 | Server Error | Failed to initialize with built-in adapters |
| `BST_INIT_CONFIG_FAILED` | 500 | Server Error | Failed to initialize with provided configuration |
| `BST_TEST_CONNECTION_FAILED` | 503 | Service Unavailable | Failed to test database connections |
| **Core Errors (COR)** |
| `COR_ACCESS_DENIED_READ` | 403 | Forbidden | User does not have read access to the requested collection |
| `COR_QUERY_VALIDATION_FAILED` | 400 | Bad Request | Query validation failed against adapter capabilities |
| `COR_ADAPTER_CONTEXT_FAILED` | 500 | Server Error | Failed to set adapter context for query execution |
| `COR_RBAC_FEATURES_INVALID` | 403 | Forbidden | RBAC features must be returned as an array |
| `COR_RBAC_FEATURES_FAILED` | 500 | Server Error | Failed to retrieve RBAC features for collection |
| `COR_ADAPTER_NOT_FOUND` | 404 | Not Found | No adapter found for the specified database type |
| `COR_RELATIONSHIP_NOT_INITIALIZED` | 500 | Server Error | Relationship registry must be initialized |
| `COR_JOINS_INVALID_TYPE` | 400 | Bad Request | Joins parameter must be an array |
| `COR_RELATIONSHIP_NOT_FOUND` | 500 | Server Error | Failed to retrieve relationships for collection |
| `COR_QUERY_OBJECT_REQUIRED` | 400 | Bad Request | Query object is required for processing |
| `COR_COLLECTION_NAME_INVALID` | 400 | Bad Request | Valid collection name string is required |
| `COR_ROLES_INVALID_TYPE` | 403 | Forbidden | Roles parameter must be an array of strings |
| `COR_RBAC_RESTRICTION_FAILED` | 500 | Server Error | Failed to apply RBAC field restrictions |
| **Query Converter Errors (QRY)** |
| `QRY_CURRENT_QUERY_NOT_INITIALIZED` | 400 | Bad Request | Current query context is not initialized |
| **Adapter Registry Errors (ADP)** |
| `ADP_MODULE_INVALID` | 500 | Server Error | Invalid adapter module format |
| `ADP_IMPLEMENTATION_INVALID` | 500 | Server Error | Invalid adapter implementation |
| `ADP_LOAD_FAILED` | 500 | Server Error | Failed to load adapter from specified path |
| `ADP_NOT_INITIALIZED` | 500 | Server Error | Adapter must be initialized before use |
| **RBAC Validator Errors (RBC)** |
| `RBC_COLLECTION_NOT_FOUND` | 400 | Bad Request | Collection not found in RBAC configuration |
| `RBC_ACCESS_DENIED` | 403 | Forbidden | User does not have required access to perform this action |
| **General Errors** |
| `UNKNOWN_ERROR` | 500 | Server Error | An unknown error occurred |
| `WRAPPED_ERROR` | 500 | Server Error | An error was wrapped from another source |

## Status Code Categories

### 4xx Client Errors
- **400 Bad Request**: Invalid input, validation failures, missing required data
  - `COR_QUERY_VALIDATION_FAILED`
  - `COR_JOINS_INVALID_TYPE`
  - `COR_QUERY_OBJECT_REQUIRED`
  - `COR_COLLECTION_NAME_INVALID`
  - `QRY_CURRENT_QUERY_NOT_INITIALIZED`
  - `RBC_COLLECTION_NOT_FOUND`

- **403 Forbidden**: Permission/authorization failures
  - `COR_ACCESS_DENIED_READ`
  - `COR_RBAC_FEATURES_INVALID`
  - `COR_ROLES_INVALID_TYPE`
  - `RBC_ACCESS_DENIED`

- **404 Not Found**: Resource not found
  - `COR_ADAPTER_NOT_FOUND`

### 5xx Server Errors
- **500 Internal Server Error**: General server errors
  - `BST_CONFIG_REQUIRED`
  - `BST_CORE_NOT_INITIALIZED`
  - `BST_INIT_BUILTIN_FAILED`
  - `BST_INIT_CONFIG_FAILED`
  - `COR_ADAPTER_CONTEXT_FAILED`
  - `COR_RBAC_FEATURES_FAILED`
  - `COR_RELATIONSHIP_NOT_INITIALIZED`
  - `COR_RELATIONSHIP_NOT_FOUND`
  - `COR_RBAC_RESTRICTION_FAILED`
  - `ADP_MODULE_INVALID`
  - `ADP_IMPLEMENTATION_INVALID`
  - `ADP_LOAD_FAILED`
  - `ADP_NOT_INITIALIZED`
  - `UNKNOWN_ERROR`
  - `WRAPPED_ERROR`

- **503 Service Unavailable**: Service/connection failures
  - `BST_ADAPTER_LIST_FAILED`
  - `BST_TEST_CONNECTION_FAILED`

## Usage Examples

### Client Error (400)
```javascript
throw new QueryError(ErrorCodes.COR_QUERY_VALIDATION_FAILED, {
  errors: validationErrors
});
// Status: 400, Message: "Query validation failed against adapter capabilities"
```

### Permission Error (403)
```javascript
throw new AuthorizationError(ErrorCodes.COR_ACCESS_DENIED_READ, {
  collection: 'users',
  roles: ['viewer']
});
// Status: 403, Message: "User does not have read access to the requested collection"
```

### Not Found Error (404)
```javascript
throw new NotFoundError(ErrorCodes.COR_ADAPTER_NOT_FOUND, {
  databaseType: 'unknown-db'
});
// Status: 404, Message: "No adapter found for the specified database type"
```

### Server Error (500)
```javascript
throw new RelationshipError(ErrorCodes.COR_RELATIONSHIP_NOT_INITIALIZED);
// Status: 500, Message: "Relationship registry must be initialized"
```

### Service Unavailable (503)
```javascript
throw new ConnectionError(ErrorCodes.BST_TEST_CONNECTION_FAILED, {
  adapters: ['mongodb', 'postgresql']
});
// Status: 503, Message: "Failed to test database connections"
```
