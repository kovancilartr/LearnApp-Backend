import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
  timestamp: string;
}

/**
 * Create a success response object
 */
export const createSuccessResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create an error response object
 */
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any
): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
};

/**
 * Send a success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response = createSuccessResponse(data, message);
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response => {
  const response = createErrorResponse(code, message, details);
  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(
  res: Response, 
  data: T, 
  message?: string
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send an unauthorized response (401)
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return sendError(res, 'UNAUTHORIZED', message, 401);
};

/**
 * Send a forbidden response (403)
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return sendError(res, 'FORBIDDEN', message, 403);
};

/**
 * Send a not found response (404)
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return sendError(res, 'NOT_FOUND', message, 404);
};

/**
 * Send a validation error response (400)
 */
export const sendValidationError = (
  res: Response,
  details: any,
  message: string = 'Validation failed'
): Response => {
  return sendError(res, 'VALIDATION_ERROR', message, 400, details);
};