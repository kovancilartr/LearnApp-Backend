import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/response.utils';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

/**
 * Rate limiting middleware to prevent abuse
 */
export const createRateLimit = (options: {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    if (rateLimitStore[key] && now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }

    // Initialize or update counter
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      rateLimitStore[key].count++;
    }

    const { count, resetTime } = rateLimitStore[key];

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    });

    // Check if limit exceeded
    if (count > maxRequests) {
      const response = createErrorResponse('RATE_LIMIT_EXCEEDED', message);
      res.status(429).json(response);
      return;
    }

    next();
  };
};

/**
 * Quiz-specific rate limiting
 */
export const quizRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 quiz attempts per 15 minutes
  message: 'Too many quiz attempts, please wait before trying again',
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated
    const userId = (req as any).user?.id;
    return userId ? `quiz_${userId}` : `quiz_${req.ip}`;
  }
});

/**
 * Quiz submission rate limiting (stricter)
 */
export const quizSubmissionRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 submissions per 5 minutes
  message: 'Too many quiz submissions, please wait before submitting again',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `quiz_submit_${userId}` : `quiz_submit_${req.ip}`;
  }
});

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later'
});

/**
 * File upload rate limiting
 */
export const fileUploadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 file uploads per 15 minutes
  message: 'Too many file uploads, please wait before uploading more files',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `upload_${userId}` : `upload_${req.ip}`;
  }
});