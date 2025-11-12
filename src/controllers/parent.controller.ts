import { Response } from 'express';
import { ParentService } from '../services/parent.service';
import { AuthenticatedRequest } from '../types/auth.types';

export class ParentController {
  /**
   * Get all children profiles for the authenticated parent
   */
  static async getChildrenProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access children profiles',
          },
        });
        return;
      }

      const childrenProfiles = await ParentService.getChildrenProfiles(userId);

      res.status(200).json({
        success: true,
        data: {
          children: childrenProfiles,
          count: childrenProfiles.length,
        },
      });
    } catch (error: any) {
      console.error('Get children profiles error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get children profiles',
        },
      });
    }
  }

  /**
   * Get detailed progress report for a specific child
   */
  static async getChildProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;
      const { childId } = req.params;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access child progress',
          },
        });
        return;
      }

      if (!childId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Child ID is required',
          },
        });
        return;
      }

      const progressReport = await ParentService.getChildProgress(userId, childId);

      res.status(200).json({
        success: true,
        data: progressReport,
      });
    } catch (error: any) {
      console.error('Get child progress error:', error);
      
      if (error.message === 'Parent profile not found' || error.message === 'Child does not belong to this parent') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get child progress',
        },
      });
    }
  }

  /**
   * Get quiz results for a specific child
   */
  static async getChildQuizResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;
      const { childId } = req.params;
      const { limit } = req.query;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access child quiz results',
          },
        });
        return;
      }

      if (!childId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Child ID is required',
          },
        });
        return;
      }

      const limitNumber = limit ? parseInt(limit as string, 10) : undefined;
      const quizResults = await ParentService.getChildQuizResults(userId, childId, limitNumber);

      res.status(200).json({
        success: true,
        data: {
          quizResults,
          count: quizResults.length,
        },
      });
    } catch (error: any) {
      console.error('Get child quiz results error:', error);
      
      if (error.message === 'Parent profile not found' || error.message === 'Child does not belong to this parent') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get child quiz results',
        },
      });
    }
  }

  /**
   * Create enrollment request for child
   */
  static async createEnrollmentRequestForChild(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;
      const { childId } = req.params;
      const { courseId, message } = req.body;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can create enrollment requests for children',
          },
        });
        return;
      }

      if (!childId || !courseId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Child ID and Course ID are required',
          },
        });
        return;
      }

      const enrollmentRequest = await ParentService.createEnrollmentRequestForChild(
        userId,
        childId,
        courseId,
        message
      );

      res.status(201).json({
        success: true,
        data: enrollmentRequest,
        message: 'Enrollment request created successfully',
      });
    } catch (error: any) {
      console.error('Create enrollment request for child error:', error);
      
      if (error.message === 'Parent profile not found' || 
          error.message === 'Child does not belong to this parent' ||
          error.message === 'Course not found' ||
          error.message === 'Child is already enrolled in this course' ||
          error.message === 'Enrollment request already exists for this course') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create enrollment request',
        },
      });
    }
  }

  /**
   * Get enrollment requests for all children
   */
  static async getChildrenEnrollmentRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access children enrollment requests',
          },
        });
        return;
      }

      const enrollmentRequests = await ParentService.getChildrenEnrollmentRequests(userId);

      res.status(200).json({
        success: true,
        data: {
          enrollmentRequests,
          count: enrollmentRequests.length,
        },
      });
    } catch (error: any) {
      console.error('Get children enrollment requests error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get enrollment requests',
        },
      });
    }
  }

  /**
   * Get notifications for a specific child
   */
  static async getChildNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;
      const { childId } = req.params;
      const { limit } = req.query;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access child notifications',
          },
        });
        return;
      }

      if (!childId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Child ID is required',
          },
        });
        return;
      }

      const limitNumber = limit ? parseInt(limit as string, 10) : undefined;
      const notifications = await ParentService.getChildNotifications(userId, childId, limitNumber);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          count: notifications.length,
        },
      });
    } catch (error: any) {
      console.error('Get child notifications error:', error);
      
      if (error.message === 'Parent profile not found' || error.message === 'Child does not belong to this parent') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get child notifications',
        },
      });
    }
  }

  /**
   * Get parent dashboard summary
   */
  static async getParentDashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, role } = req.user!;

      // Only parents can access this endpoint
      if (role !== 'PARENT') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access dashboard summary',
          },
        });
        return;
      }

      const summary = await ParentService.getParentDashboardSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Get parent dashboard summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get dashboard summary',
        },
      });
    }
  }
}