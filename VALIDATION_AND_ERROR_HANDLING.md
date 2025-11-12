# Authentication Validation and Error Handling

This document describes the comprehensive input validation and error handling implementation for the authentication system.

## Overview

The authentication system implements multiple layers of validation and error handling:

1. **Input Validation** - Zod schemas with comprehensive validation rules
2. **Validation Middleware** - Enhanced error formatting and handling
3. **Error Handling** - Consistent error responses with user-friendly messages
4. **Authentication Error Utilities** - Centralized error management

## Input Validation Schemas

### Email Validation
- **Format**: Valid email format with comprehensive checks
- **Length**: 1-255 characters
- **Rules**:
  - Cannot contain consecutive dots (`..`)
  - Cannot start or end with dots
  - Automatically converted to lowercase
  - Trimmed of whitespace

### Password Validation

#### Login Password (Less Strict)
- **Length**: 1-128 characters
- **Purpose**: For login attempts (existing passwords)

#### Strong Password (Registration/Updates)
- **Length**: 8-128 characters
- **Requirements**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
  - No whitespace characters
  - Cannot contain common words (password, 123456, qwerty, admin, letmein)

### Name Validation
- **Length**: 2-100 characters
- **Format**: Letters, spaces, hyphens, apostrophes, and dots only
- **Rules**: Trimmed of whitespace

### Role Validation
- **Values**: ADMIN, TEACHER, STUDENT, PARENT
- **Error**: Custom error message listing valid options

### Refresh Token Validation
- **Length**: 1-1000 characters
- **Rules**: Trimmed of whitespace

## Cross-Field Validation

### Registration Schema
- **Name-Email Similarity**: Prevents names that are too similar to email local part for security
- **Password Reuse**: New password must be different from current password (password updates)

## Validation Middleware Features

### Enhanced Error Formatting
```typescript
interface ValidationError {
  field: string;        // e.g., "body.email"
  message: string;      // User-friendly message
  code: string;         // Zod error code
  received?: any;       // What was received (for type errors)
  expected?: string;    // What was expected
}
```

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    details: {
      errors: ValidationError[],
      errorCount: number
    }
  },
  timestamp: string
}
```

### Validation Types
- **Body Validation**: Request body data
- **Query Validation**: URL query parameters
- **Params Validation**: Route parameters
- **Headers Validation**: Request headers
- **Conditional Validation**: Based on request conditions

## Error Handling System

### Authentication Error Codes
```typescript
const AUTH_ERROR_CODES = {
  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_ROLE: 'INVALID_ROLE',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Token errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  
  // Password errors
  INCORRECT_CURRENT_PASSWORD: 'INCORRECT_CURRENT_PASSWORD',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};
```

### Error Response Features
- **Consistent Format**: All errors follow the same response structure
- **User-Friendly Messages**: Clear, actionable error messages
- **Error Details**: Additional context for debugging (development mode)
- **HTTP Status Codes**: Appropriate status codes for each error type
- **Suggestions**: Helpful suggestions for resolving errors

### AuthError Class
```typescript
class AuthError extends Error {
  public readonly code: keyof typeof AUTH_ERROR_CODES;
  public readonly statusCode: number;
  public readonly details?: any;
}
```

## Controller Error Handling

### Simplified Error Handling
Controllers use the `handleAuthError` utility for consistent error responses:

```typescript
static async register(req: Request, res: Response): Promise<void> {
  try {
    const result = await AuthService.register(req.body);
    const response = createSuccessResponse(result, 'Account created successfully');
    res.status(201).json(response);
  } catch (error) {
    handleAuthError(error, res);
  }
}
```

### Automatic Error Detection
The error handler automatically detects and handles:
- JWT errors (invalid, expired, not active)
- Prisma database errors
- Validation errors
- Custom authentication errors
- Common error patterns

## Validation Rules Reference

### Email Rules
- ✅ `user@example.com`
- ❌ `invalid-email`
- ❌ `user..name@example.com`
- ❌ `.user@example.com`
- ❌ `user@example.com.`

### Password Rules (Strong)
- ✅ `SecurePass123!`
- ❌ `weak` (too short)
- ❌ `password123` (missing uppercase, special char)
- ❌ `Valid Password123!` (contains space)
- ❌ `Password123!` (contains common word)

### Name Rules
- ✅ `John Smith`
- ✅ `Mary O'Connor`
- ✅ `Jean-Pierre`
- ✅ `Dr. Smith`
- ❌ `A` (too short)
- ❌ `John123` (contains numbers)
- ❌ `John@Smith` (invalid characters)

### Role Rules
- ✅ `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`
- ❌ `admin` (case sensitive)
- ❌ `INVALID_ROLE`

## Testing

### Validation Tests
- **Schema Validation**: Direct schema testing with various inputs
- **Middleware Testing**: Request validation middleware testing
- **Error Format Testing**: Consistent error response format
- **Edge Cases**: Boundary conditions and special characters

### Test Coverage
- ✅ Valid inputs pass validation
- ✅ Invalid inputs are rejected with appropriate errors
- ✅ Error messages are user-friendly
- ✅ Error responses follow consistent format
- ✅ Cross-field validation works correctly

## Usage Examples

### Route with Validation
```typescript
router.post('/register', 
  validateRequest(registerSchema), 
  AuthController.register
);
```

### Custom Validation
```typescript
router.post('/special-endpoint',
  validateConditional(
    (req) => req.headers['x-special'] === 'true',
    specialSchema
  ),
  controller
);
```

### Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "body.email",
          "message": "Please enter a valid email address",
          "code": "invalid_string"
        },
        {
          "field": "body.password",
          "message": "Password must be at least 8 characters long",
          "code": "too_small"
        }
      ],
      "errorCount": 2
    }
  },
  "timestamp": "2025-01-05T12:00:00.000Z"
}
```

## Security Considerations

### Input Sanitization
- All inputs are validated and sanitized
- SQL injection prevention through Prisma ORM
- XSS prevention through input validation
- CSRF protection through token validation

### Password Security
- Strong password requirements
- Common password detection
- Password reuse prevention
- Secure password hashing (bcrypt)

### Rate Limiting
- Error codes for rate limiting scenarios
- Consistent error responses for blocked requests
- Graceful degradation under load

## Performance Considerations

### Validation Performance
- Efficient Zod schema validation
- Early validation failure (fail-fast)
- Minimal memory allocation for errors
- Cached validation results where appropriate

### Error Handling Performance
- Minimal error object creation
- Efficient error message formatting
- Reduced stack trace processing in production
- Optimized error response serialization

This comprehensive validation and error handling system ensures a secure, user-friendly, and maintainable authentication system that provides clear feedback to users while protecting against common security vulnerabilities.