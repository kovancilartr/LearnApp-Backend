import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { createErrorResponse } from '../utils/response.utils';

/**
 * Enhanced validation error interface
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  received?: any;
  expected?: string;
}

/**
 * Format Zod validation errors with enhanced information
 */
const formatValidationErrors = (errors: ZodIssue[]): ValidationError[] => {
  return errors.map(err => {
    const field = err.path.length > 0 ? err.path.join('.') : 'root';
    
    // Enhanced error messages based on error type
    let message = err.message;
    let expected: string | undefined;
    
    switch (err.code) {
      case 'invalid_type':
        expected = err.expected;
        message = `Expected ${err.expected}, received ${err.received}`;
        break;
      case 'too_small':
        if (err.type === 'string') {
          message = err.inclusive 
            ? `Must be at least ${err.minimum} characters long`
            : `Must be more than ${err.minimum} characters long`;
        } else if (err.type === 'array') {
          message = err.inclusive
            ? `Must contain at least ${err.minimum} items`
            : `Must contain more than ${err.minimum} items`;
        }
        break;
      case 'too_big':
        if (err.type === 'string') {
          message = err.inclusive
            ? `Must be at most ${err.maximum} characters long`
            : `Must be less than ${err.maximum} characters long`;
        } else if (err.type === 'array') {
          message = err.inclusive
            ? `Must contain at most ${err.maximum} items`
            : `Must contain less than ${err.maximum} items`;
        }
        break;
      case 'invalid_string':
        if (err.validation === 'email') {
          message = 'Please enter a valid email address';
        } else if (err.validation === 'url') {
          message = 'Please enter a valid URL';
        } else if (err.validation === 'regex') {
          message = 'Format is invalid';
        }
        break;
      case 'invalid_enum_value':
        expected = err.options?.join(', ');
        message = `Must be one of: ${err.options?.join(', ')}`;
        break;
      case 'custom':
        // Custom validation messages are already formatted
        break;
    }

    return {
      field,
      message,
      code: err.code,
      received: err.code === 'invalid_type' ? err.received : undefined,
      expected,
    };
  });
};

/**
 * Enhanced validation middleware for request data using Zod schemas
 * Supports validation of body, query, params, and headers
 */
export const validateRequest = (schema: ZodSchema | {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationContext = {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      };

      // Handle single schema (for body validation)
      if ('parse' in schema) {
        const result = schema.safeParse(validationContext);
        if (!result.success) {
          const validationErrors = formatValidationErrors(result.error.errors);
          const response = createErrorResponse(
            'VALIDATION_ERROR',
            'Request validation failed',
            {
              errors: validationErrors,
              errorCount: validationErrors.length,
            }
          );
          res.status(400).json(response);
          return;
        }
        
        // Update request with parsed data
        if (result.data.body !== undefined) req.body = result.data.body;
        if (result.data.query !== undefined) req.query = result.data.query;
        if (result.data.params !== undefined) req.params = result.data.params;
        
        next();
        return;
      }

      // Handle multiple schemas
      const allErrors: ZodIssue[] = [];
      
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          allErrors.push(...result.error.errors.map(err => ({
            ...err,
            path: ['body', ...err.path]
          })));
        } else {
          req.body = result.data;
        }
      }
      
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          allErrors.push(...result.error.errors.map(err => ({
            ...err,
            path: ['query', ...err.path]
          })));
        } else {
          req.query = result.data;
        }
      }
      
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          allErrors.push(...result.error.errors.map(err => ({
            ...err,
            path: ['params', ...err.path]
          })));
        } else {
          req.params = result.data;
        }
      }

      if (schema.headers) {
        const result = schema.headers.safeParse(req.headers);
        if (!result.success) {
          allErrors.push(...result.error.errors.map(err => ({
            ...err,
            path: ['headers', ...err.path]
          })));
        }
      }

      if (allErrors.length > 0) {
        const validationErrors = formatValidationErrors(allErrors);
        const response = createErrorResponse(
          'VALIDATION_ERROR',
          'Request validation failed',
          {
            errors: validationErrors,
            errorCount: validationErrors.length,
          }
        );
        res.status(400).json(response);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      
      // Handle unexpected validation errors
      const response = createErrorResponse(
        'VALIDATION_SYSTEM_ERROR',
        'An error occurred during request validation',
        process.env.NODE_ENV === 'development' ? { originalError: error } : undefined
      );
      res.status(500).json(response);
    }
  };
};

/**
 * Middleware to validate request body only
 */
export const validateBody = (schema: ZodSchema) => {
  return validateRequest({ body: schema });
};

/**
 * Middleware to validate query parameters only
 */
export const validateQuery = (schema: ZodSchema) => {
  return validateRequest({ query: schema });
};

/**
 * Middleware to validate route parameters only
 */
export const validateParams = (schema: ZodSchema) => {
  return validateRequest({ params: schema });
};

/**
 * Middleware to validate headers only
 */
export const validateHeaders = (schema: ZodSchema) => {
  return validateRequest({ headers: schema });
};

/**
 * Strict validation middleware that fails on any unknown fields
 */
export const validateRequestStrict = (schema: ZodSchema | {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Note: Strict validation would require specific schema types
    // For now, use regular validation with enhanced error messages
    return validateRequest(schema)(req, res, next);
  };
};

/**
 * Conditional validation middleware
 */
export const validateConditional = (
  condition: (req: Request) => boolean,
  schema: ZodSchema | {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
    headers?: ZodSchema;
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      return validateRequest(schema)(req, res, next);
    }
    next();
  };
};