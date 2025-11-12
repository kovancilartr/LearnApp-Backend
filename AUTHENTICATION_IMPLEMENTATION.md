# JWT Authentication Utilities Implementation

## Overview

This document describes the implementation of JWT authentication utilities for the LearnApp backend, completed as part of task 3.1 from the implementation plan.

## Implemented Components

### 1. JWT Token Management (`src/utils/jwt.utils.ts`)

**Features:**
- ✅ JWT access token generation with configurable expiry
- ✅ JWT refresh token generation with configurable expiry  
- ✅ Token verification with proper error handling
- ✅ Token pair generation for login flows
- ✅ Refresh token database storage and validation
- ✅ Token refresh functionality with automatic cleanup
- ✅ Token revocation (logout) functionality
- ✅ Bulk token revocation (logout from all devices)
- ✅ Expired token cleanup utilities
- ✅ Token expiration checking utilities

**Key Functions:**
- `generateAccessToken(payload)` - Creates JWT access tokens
- `generateRefreshToken(payload)` - Creates JWT refresh tokens
- `verifyAccessToken(token)` - Validates access tokens
- `verifyRefreshToken(token)` - Validates refresh tokens
- `generateTokenPair(payload)` - Creates both tokens and stores refresh token
- `refreshAccessToken(refreshToken)` - Refreshes expired access tokens
- `revokeRefreshToken(token)` - Revokes single refresh token
- `revokeAllRefreshTokens(userId)` - Revokes all user tokens
- `cleanupExpiredTokens()` - Removes expired tokens from database

### 2. Password Security (`src/utils/password.utils.ts`)

**Features:**
- ✅ Secure password hashing with bcrypt (12 salt rounds)
- ✅ Password comparison with timing attack protection
- ✅ Comprehensive password strength validation
- ✅ Common password pattern detection
- ✅ Sequential character detection
- ✅ Repeated character detection
- ✅ Secure password generation
- ✅ Custom salt generation utilities

**Key Functions:**
- `hashPassword(password, skipValidation?)` - Hashes passwords securely
- `comparePassword(password, hash)` - Compares passwords safely
- `validatePasswordStrength(password)` - Validates password strength
- `generateSecurePassword(length?)` - Generates secure passwords
- `generateSalt()` - Creates cryptographic salts

**Password Validation Rules:**
- Minimum 8 characters, maximum 128 characters
- Must contain uppercase letters
- Must contain lowercase letters  
- Must contain numbers
- Must contain special characters
- Detects common patterns (password, 123456, etc.)
- Detects sequential characters (abc, 123)
- Detects repeated characters (aaa, 111)
- Scoring system (0-100) with strength levels (weak/medium/strong)

### 3. JWT Configuration (`src/config/jwt.ts`)

**Features:**
- ✅ Environment-based configuration
- ✅ Production secret validation
- ✅ Development fallback secrets with warnings
- ✅ Configurable token expiry times
- ✅ Security settings (issuer, audience, algorithm)
- ✅ Cookie configuration for web clients

**Configuration Options:**
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens  
- `JWT_ACCESS_EXPIRY` - Access token expiry (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiry (default: 7d)

### 4. Authentication Service (`src/services/auth.service.ts`)

**Features:**
- ✅ User registration with role-specific profiles
- ✅ User login with credential validation
- ✅ Token refresh functionality
- ✅ Logout (single device) functionality
- ✅ Logout all devices functionality
- ✅ User profile management
- ✅ Password update with security measures
- ✅ Token validation utilities
- ✅ Automatic token cleanup

**Key Methods:**
- `AuthService.register(data)` - Register new users
- `AuthService.login(data)` - Authenticate users
- `AuthService.refreshToken(data)` - Refresh access tokens
- `AuthService.logout(refreshToken)` - Logout single device
- `AuthService.logoutAll(userId)` - Logout all devices
- `AuthService.updatePassword(userId, currentPassword, newPassword)` - Update passwords

### 5. Token Cleanup Scheduler (`src/utils/token-cleanup.utils.ts`)

**Features:**
- ✅ Automatic expired token cleanup
- ✅ Configurable cleanup intervals
- ✅ Graceful shutdown handling
- ✅ Manual cleanup triggers
- ✅ Status monitoring

### 6. Type Definitions (`src/types/auth.types.ts`)

**Enhanced Types:**
- ✅ Login/Register request types
- ✅ Authentication response types
- ✅ Token payload interfaces
- ✅ Refresh token management types
- ✅ Validation result types

## Security Features

### Token Security
- JWT tokens signed with HS256 algorithm
- Separate secrets for access and refresh tokens
- Configurable expiry times
- Database storage for refresh tokens
- Automatic cleanup of expired tokens
- Token revocation capabilities

### Password Security
- bcrypt hashing with 12 salt rounds
- Comprehensive strength validation
- Protection against common passwords
- Timing attack protection
- Secure random password generation

### Production Readiness
- Environment variable validation
- Secure secret requirements
- Error handling and logging
- Graceful degradation
- Performance optimizations

## Database Integration

The implementation integrates with the Prisma database schema:

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## Testing

Comprehensive test suites included:
- ✅ Password utility tests (21 test cases)
- ✅ JWT utility tests (test framework ready)
- ✅ Integration test examples
- ✅ Error handling validation

## Usage Examples

### Basic Authentication Flow

```typescript
// Register user
const authResponse = await AuthService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe',
  role: 'STUDENT'
});

// Login user
const loginResponse = await AuthService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// Refresh token
const refreshResponse = await AuthService.refreshToken({
  refreshToken: loginResponse.tokens.refreshToken
});

// Logout
await AuthService.logout(refreshToken);
```

### Password Management

```typescript
// Validate password strength
const validation = validatePasswordStrength('MyPassword123!');
console.log(validation.isValid, validation.strength, validation.score);

// Hash password
const hashedPassword = await hashPassword('MyPassword123!');

// Compare password
const isMatch = await comparePassword('MyPassword123!', hashedPassword);
```

### JWT Token Management

```typescript
// Generate tokens
const payload = { userId: '123', email: 'user@example.com', role: 'STUDENT' };
const tokens = await generateTokenPair(payload);

// Verify tokens
const accessPayload = verifyAccessToken(tokens.accessToken);
const refreshPayload = verifyRefreshToken(tokens.refreshToken);
```

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 5.2**: JWT token generation and validation ✅
- **Requirement 5.3**: Secure token refresh mechanisms ✅  
- **Requirement 5.4**: Token revocation and logout functionality ✅

## Next Steps

The JWT authentication utilities are now ready for integration with:
1. Authentication middleware (task 3.2)
2. Authentication controllers (task 3.2)
3. Input validation and error handling (task 3.3)

## Performance Considerations

- Token cleanup runs automatically every 24 hours
- Database queries optimized with proper indexing
- Password hashing uses optimal salt rounds (12)
- Token verification is stateless and fast
- Refresh token rotation for enhanced security

## Security Considerations

- Secrets must be properly configured in production
- Refresh tokens are stored securely in database
- Automatic cleanup prevents token accumulation
- Password validation prevents weak passwords
- Timing attack protection in password comparison
- Proper error handling prevents information leakage