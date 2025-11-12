import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { prisma } from '../config/database';
import { createErrorResponse } from '../utils/response.utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to authenticate JWT access tokens
 * Verifies the token and attaches user information to the request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Debug log
    console.log('🔍 Auth middleware debug:', {
      authHeader: authHeader ? authHeader.substring(0, 50) + '...' : 'none',
      token: token ? token.substring(0, 50) + '...' : 'none'
    });

    if (!token) {
      const response = createErrorResponse('NO_TOKEN', 'Access token is required');
      res.status(401).json(response);
      return;
    }

    // Verify token using JWT utilities
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      const response = createErrorResponse('INVALID_TOKEN', 'Invalid access token');
      res.status(401).json(response);
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      const response = createErrorResponse('USER_NOT_FOUND', 'User not found or deactivated');
      res.status(401).json(response);
      return;
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    let errorCode = 'INVALID_TOKEN';
    let errorMessage = 'Invalid access token';
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Access token has expired';
      } else if (error.message.includes('malformed')) {
        errorCode = 'MALFORMED_TOKEN';
        errorMessage = 'Malformed access token';
      }
    }
    
    const response = createErrorResponse(errorCode, errorMessage);
    res.status(401).json(response);
  }
};

/**
 * Optional authentication middleware
 * Attaches user information if token is present and valid, but doesn't require authentication
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Try to verify token
    const decoded = verifyAccessToken(token);
    
    if (decoded) {
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true }
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth, just continue without user
    console.warn('Optional auth middleware warning:', error);
    next();
  }
};

// Export alias for consistency
export const authMiddleware = authenticateToken;