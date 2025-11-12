import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { createErrorResponse } from '../utils/response.utils';

/**
 * Role-based access control middleware
 * Requires user to be authenticated and have one of the allowed roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
      res.status(401).json(response);
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      const response = createErrorResponse(
        'FORBIDDEN', 
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      );
      res.status(403).json(response);
      return;
    }

    next();
  };
};

/**
 * Middleware to require specific user ownership
 * Checks if the authenticated user owns the resource (by userId parameter)
 */
export const requireOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
    res.status(401).json(response);
    return;
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    const response = createErrorResponse('MISSING_USER_ID', 'User ID is required');
    res.status(400).json(response);
    return;
  }

  // Admin can access any resource, others can only access their own
  if (req.user.role !== 'ADMIN' && req.user.id !== resourceUserId) {
    const response = createErrorResponse('FORBIDDEN', 'You can only access your own resources');
    res.status(403).json(response);
    return;
  }

  next();
};

/**
 * Middleware to require admin or ownership
 * Allows access if user is admin OR owns the resource
 */
export const requireAdminOrOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
    res.status(401).json(response);
    return;
  }

  // Admin can access anything
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Check ownership
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    const response = createErrorResponse('MISSING_USER_ID', 'User ID is required');
    res.status(400).json(response);
    return;
  }

  if (req.user.id !== resourceUserId) {
    const response = createErrorResponse('FORBIDDEN', 'Access denied. Admin privileges or resource ownership required');
    res.status(403).json(response);
    return;
  }

  next();
};

/**
 * Middleware for parent-child relationship access
 * Allows parents to access their children's resources
 */
export const requireParentOrOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
    res.status(401).json(response);
    return;
  }

  // Admin can access anything
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  const targetUserId = req.params.userId || req.body.userId;
  
  if (!targetUserId) {
    const response = createErrorResponse('MISSING_USER_ID', 'User ID is required');
    res.status(400).json(response);
    return;
  }

  // User can access their own resources
  if (req.user.id === targetUserId) {
    next();
    return;
  }

  // If user is a parent, check if they can access child's resources
  if (req.user.role === 'PARENT') {
    try {
      const { prisma } = await import('../config/database');
      
      const parentProfile = await prisma.parent.findUnique({
        where: { userId: req.user.id },
        include: {
          children: {
            select: { userId: true }
          }
        }
      });

      if (parentProfile) {
        const childUserIds = parentProfile.children.map(child => child.userId);
        if (childUserIds.includes(targetUserId)) {
          next();
          return;
        }
      }
    } catch (error) {
      console.error('Parent-child relationship check error:', error);
    }
  }

  const response = createErrorResponse('FORBIDDEN', 'Access denied. You can only access your own resources or your children\'s resources');
  res.status(403).json(response);
};

// Convenience functions for specific roles
export const requireAdmin = requireRole(['ADMIN']);
export const requireTeacher = requireRole(['ADMIN', 'TEACHER']);
export const requireStudent = requireRole(['ADMIN', 'STUDENT']);
export const requireParent = requireRole(['ADMIN', 'PARENT']);

// Combined role requirements
export const requireTeacherOrAdmin = requireRole(['ADMIN', 'TEACHER']);
export const requireStudentOrAdmin = requireRole(['ADMIN', 'STUDENT']);
export const requireParentOrAdmin = requireRole(['ADMIN', 'PARENT']);

// Multiple role combinations
export const requireTeacherOrStudent = requireRole(['ADMIN', 'TEACHER', 'STUDENT']);
export const requireParentOrStudent = requireRole(['ADMIN', 'PARENT', 'STUDENT']);
export const requireAnyRole = requireRole(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);

/**
 * Role middleware that accepts Role enum values
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return requireRole(allowedRoles);
};