import * as crypto from 'crypto';

// Validate JWT secrets in production
const validateSecret = (secret: string, name: string): string => {
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.includes('your-') || secret.length < 32) {
      throw new Error(`${name} must be a secure secret in production (minimum 32 characters)`);
    }
  }
  return secret;
};

// Get JWT secrets with fallback for development
const getAccessTokenSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) {
    return validateSecret(secret, 'JWT_ACCESS_SECRET');
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET must be provided in production');
  }
  
  console.warn('⚠️  Using fallback JWT access secret for development. Set JWT_ACCESS_SECRET for production.');
  return 'development-access-secret-key-not-for-production-use-minimum-32-chars';
};

const getRefreshTokenSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret) {
    return validateSecret(secret, 'JWT_REFRESH_SECRET');
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be provided in production');
  }
  
  console.warn('⚠️  Using fallback JWT refresh secret for development. Set JWT_REFRESH_SECRET for production.');
  return 'development-refresh-secret-key-not-for-production-use-minimum-32-chars';
};

export const jwtConfig = {
  accessTokenSecret: getAccessTokenSecret(),
  refreshTokenSecret: getRefreshTokenSecret(),
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: 'learnapp',
  audience: 'learnapp-users',
  algorithm: 'HS256' as const,
};

export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
};

export const authConfig = {
  // Maximum number of refresh tokens per user
  maxRefreshTokensPerUser: 5,
  
  // Token cleanup interval (in milliseconds)
  tokenCleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  
  // Maximum login attempts before lockout
  maxLoginAttempts: 5,
  
  // Account lockout duration (in milliseconds)
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  
  // Password reset token expiry
  passwordResetExpiry: '1h',
  
  // Email verification token expiry
  emailVerificationExpiry: '24h',
};

/**
 * Parse JWT expiry string to milliseconds
 */
export const parseExpiryToMs = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid expiry unit: ${unit}`);
  }
};

/**
 * Get expiry date from expiry string
 */
export const getExpiryDate = (expiry: string): Date => {
  const ms = parseExpiryToMs(expiry);
  return new Date(Date.now() + ms);
};