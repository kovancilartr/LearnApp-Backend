import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { createErrorResponse } from '../utils/response.utils';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Global error handling middleware
 * Handles different types of errors and returns consistent API responses
 */
export const errorHandler = (
  error: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    const response = createErrorResponse(
      'VALIDATION_ERROR',
      'Request validation failed',
      validationErrors
    );
    res.status(400).json(response);
    return;
  }

  // Prisma database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';
    let message = 'Database operation failed';

    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'A record with this data already exists';
        break;
      case 'P2025':
        statusCode = 404;
        errorCode = 'RECORD_NOT_FOUND';
        message = 'The requested record was not found';
        break;
      case 'P2003':
        statusCode = 400;
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        statusCode = 400;
        errorCode = 'INVALID_ID';
        message = 'The provided ID is invalid';
        break;
      case 'P2021':
        statusCode = 404;
        errorCode = 'TABLE_NOT_FOUND';
        message = 'The table does not exist';
        break;
      case 'P2022':
        statusCode = 404;
        errorCode = 'COLUMN_NOT_FOUND';
        message = 'The column does not exist';
        break;
    }

    const response = createErrorResponse(errorCode, message, {
      prismaCode: error.code,
      meta: error.meta
    });
    res.status(statusCode).json(response);
    return;
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    const response = createErrorResponse(
      'DATABASE_VALIDATION_ERROR',
      'Database validation failed',
      { originalError: error.message }
    );
    res.status(400).json(response);
    return;
  }

  // JWT errors with enhanced details
  if (error.name === 'JsonWebTokenError') {
    const response = createErrorResponse(
      'INVALID_TOKEN', 
      'The provided token is invalid or malformed',
      { 
        tokenError: true,
        suggestion: 'Please log in again to get a new token'
      }
    );
    res.status(401).json(response);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const response = createErrorResponse(
      'TOKEN_EXPIRED', 
      'Your session has expired',
      { 
        tokenError: true,
        expired: true,
        suggestion: 'Please refresh your token or log in again'
      }
    );
    res.status(401).json(response);
    return;
  }

  if (error.name === 'NotBeforeError') {
    const response = createErrorResponse(
      'TOKEN_NOT_ACTIVE', 
      'Token is not active yet',
      { 
        tokenError: true,
        suggestion: 'Please wait and try again'
      }
    );
    res.status(401).json(response);
    return;
  }

  // Authentication-specific errors
  if (error.message.includes('Invalid email or password')) {
    const response = createErrorResponse(
      'INVALID_CREDENTIALS',
      'The email or password you entered is incorrect',
      {
        authError: true,
        suggestion: 'Please check your credentials and try again'
      }
    );
    res.status(401).json(response);
    return;
  }

  if (error.message.includes('User with this email already exists')) {
    const response = createErrorResponse(
      'EMAIL_ALREADY_EXISTS',
      'An account with this email address already exists',
      {
        authError: true,
        suggestion: 'Please use a different email or try logging in'
      }
    );
    res.status(409).json(response);
    return;
  }

  if (error.message.includes('Password validation failed')) {
    const response = createErrorResponse(
      'WEAK_PASSWORD',
      'Password does not meet security requirements',
      {
        authError: true,
        suggestion: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      }
    );
    res.status(400).json(response);
    return;
  }

  if (error.message.includes('Current password is incorrect')) {
    const response = createErrorResponse(
      'INCORRECT_CURRENT_PASSWORD',
      'The current password you entered is incorrect',
      {
        authError: true,
        suggestion: 'Please verify your current password and try again'
      }
    );
    res.status(400).json(response);
    return;
  }

  if (error.message.includes('Refresh token') && error.message.includes('expired')) {
    const response = createErrorResponse(
      'REFRESH_TOKEN_EXPIRED',
      'Your refresh token has expired',
      {
        authError: true,
        tokenError: true,
        suggestion: 'Please log in again'
      }
    );
    res.status(401).json(response);
    return;
  }

  if (error.message.includes('Refresh token') && error.message.includes('invalid')) {
    const response = createErrorResponse(
      'INVALID_REFRESH_TOKEN',
      'The refresh token is invalid or has been revoked',
      {
        authError: true,
        tokenError: true,
        suggestion: 'Please log in again'
      }
    );
    res.status(401).json(response);
    return;
  }

  // Custom API errors
  if ('statusCode' in error && error.statusCode) {
    const apiError = error as ApiError;
    const response = createErrorResponse(
      apiError.code || 'API_ERROR',
      apiError.message,
      apiError.details
    );
    res.status(apiError.statusCode || 500).json(response);
    return;
  }

  // Syntax errors
  if (error instanceof SyntaxError && 'body' in error) {
    const response = createErrorResponse(
      'INVALID_JSON',
      'Invalid JSON in request body'
    );
    res.status(400).json(response);
    return;
  }

  // Default server error
  const response = createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    process.env.NODE_ENV === 'development' 
      ? { stack: error.stack } 
      : undefined
  );
  res.status(500).json(response);
};

/**
 * Create a custom API error
 */
export const createApiError = (
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};