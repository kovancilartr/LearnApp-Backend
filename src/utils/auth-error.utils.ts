import { Response } from 'express';
import { createErrorResponse, sendError } from './response.utils';

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_ROLE: 'INVALID_ROLE',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  NAME_TOO_SIMILAR: 'NAME_TOO_SIMILAR',
  PASSWORD_REUSE: 'PASSWORD_REUSE',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Token errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_NOT_ACTIVE: 'TOKEN_NOT_ACTIVE',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  
  // Password errors
  INCORRECT_CURRENT_PASSWORD: 'INCORRECT_CURRENT_PASSWORD',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  AUTH_SERVICE_ERROR: 'AUTH_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Authentication error messages with user-friendly descriptions
 */
export const AUTH_ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_EMAIL]: 'Please enter a valid email address',
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  [AUTH_ERROR_CODES.INVALID_ROLE]: 'Please select a valid user role',
  [AUTH_ERROR_CODES.MISSING_FIELD]: 'All required fields must be provided',
  [AUTH_ERROR_CODES.INVALID_FORMAT]: 'The provided data format is invalid',
  [AUTH_ERROR_CODES.NAME_TOO_SIMILAR]: 'Name and email should not be too similar for security reasons',
  [AUTH_ERROR_CODES.PASSWORD_REUSE]: 'New password must be different from current password',
  
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect',
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email address already exists',
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: 'No account found with this email address',
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: 'Your account has been disabled. Please contact support',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to multiple failed login attempts',
  
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 'Your session is invalid. Please log in again',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [AUTH_ERROR_CODES.TOKEN_NOT_ACTIVE]: 'Your session is not yet active. Please try again',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN]: 'Your session is invalid. Please log in again',
  [AUTH_ERROR_CODES.TOKEN_REVOKED]: 'Your session has been revoked. Please log in again',
  
  [AUTH_ERROR_CODES.INCORRECT_CURRENT_PASSWORD]: 'The current password you entered is incorrect',
  [AUTH_ERROR_CODES.PASSWORD_RECENTLY_USED]: 'You cannot reuse a recently used password',
  
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please try again later',
  [AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down and try again',
  
  [AUTH_ERROR_CODES.AUTH_SERVICE_ERROR]: 'Authentication service is temporarily unavailable',
  [AUTH_ERROR_CODES.DATABASE_ERROR]: 'Database error occurred during authentication',
} as const;

/**
 * HTTP status codes for authentication errors
 */
export const AUTH_ERROR_STATUS_CODES = {
  [AUTH_ERROR_CODES.INVALID_EMAIL]: 400,
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 400,
  [AUTH_ERROR_CODES.INVALID_ROLE]: 400,
  [AUTH_ERROR_CODES.MISSING_FIELD]: 400,
  [AUTH_ERROR_CODES.INVALID_FORMAT]: 400,
  [AUTH_ERROR_CODES.NAME_TOO_SIMILAR]: 400,
  [AUTH_ERROR_CODES.PASSWORD_REUSE]: 400,
  
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: 409,
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: 404,
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: 403,
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 423,
  
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 401,
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.TOKEN_NOT_ACTIVE]: 401,
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN]: 401,
  [AUTH_ERROR_CODES.TOKEN_REVOKED]: 401,
  
  [AUTH_ERROR_CODES.INCORRECT_CURRENT_PASSWORD]: 400,
  [AUTH_ERROR_CODES.PASSWORD_RECENTLY_USED]: 400,
  
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 429,
  [AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  
  [AUTH_ERROR_CODES.AUTH_SERVICE_ERROR]: 503,
  [AUTH_ERROR_CODES.DATABASE_ERROR]: 500,
} as const;

/**
 * Create an authentication error
 */
export class AuthError extends Error {
  public readonly code: keyof typeof AUTH_ERROR_CODES;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    code: keyof typeof AUTH_ERROR_CODES,
    message?: string,
    details?: any
  ) {
    super(message || AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = AUTH_ERROR_STATUS_CODES[code];
    this.details = details;
  }
}

/**
 * Send authentication error response
 */
export const sendAuthError = (
  res: Response,
  code: keyof typeof AUTH_ERROR_CODES,
  customMessage?: string,
  details?: any
): Response => {
  const message = customMessage || AUTH_ERROR_MESSAGES[code];
  const statusCode = AUTH_ERROR_STATUS_CODES[code];
  
  return sendError(res, code, message, statusCode, {
    authError: true,
    ...details,
  });
};

/**
 * Create authentication error response object
 */
export const createAuthErrorResponse = (
  code: keyof typeof AUTH_ERROR_CODES,
  customMessage?: string,
  details?: any
) => {
  const message = customMessage || AUTH_ERROR_MESSAGES[code];
  
  return createErrorResponse(code, message, {
    authError: true,
    ...details,
  });
};

/**
 * Handle authentication errors in controllers
 */
export const handleAuthError = (error: any, res: Response): Response => {
  console.error('Authentication error:', error);

  // Handle custom AuthError
  if (error instanceof AuthError) {
    return sendAuthError(res, error.code, error.message, error.details);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendAuthError(res, 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return sendAuthError(res, 'TOKEN_EXPIRED');
  }

  if (error.name === 'NotBeforeError') {
    return sendAuthError(res, 'TOKEN_NOT_ACTIVE');
  }

  // Handle common error messages
  if (error.message?.includes('Invalid email or password')) {
    return sendAuthError(res, 'INVALID_CREDENTIALS');
  }

  if (error.message?.includes('already exists')) {
    return sendAuthError(res, 'EMAIL_ALREADY_EXISTS');
  }

  if (error.message?.includes('Password validation failed')) {
    return sendAuthError(res, 'WEAK_PASSWORD');
  }

  if (error.message?.includes('Current password is incorrect')) {
    return sendAuthError(res, 'INCORRECT_CURRENT_PASSWORD');
  }

  if (error.message?.includes('not found')) {
    return sendAuthError(res, 'USER_NOT_FOUND');
  }

  // Default to generic auth service error
  return sendAuthError(res, 'AUTH_SERVICE_ERROR', 'An authentication error occurred');
};

/**
 * Validation helper for authentication data
 */
export const validateAuthData = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },

  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    if (/\s/.test(password)) {
      errors.push('Password cannot contain whitespace characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  name: (name: string): boolean => {
    return name.length >= 2 && 
           name.length <= 100 && 
           /^[a-zA-Z\s\-'\.]+$/.test(name);
  },

  role: (role: string): boolean => {
    return ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(role);
  },
};