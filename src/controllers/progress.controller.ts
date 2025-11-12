import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ProgressService, LessonCompletionRequest } from '../services/progress.service';
import { AuthenticatedRequest } from '../types/auth.types';

export class ProgressController {
  /**
   * Update lesson completion status with enhanced toggle functionality
   * POST /api/progress/lesson-completion
   */
  static async updateLessonCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lessonId, completed, childId } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Enhanced input validation
      if (!lessonId || typeof lessonId !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LESSON_ID',
            message: 'Valid lesson ID is required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (typeof completed !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPLETION_STATUS',
            message: 'Completion status must be a boolean value',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Determine student ID based on user role
      let studentId: string;

      if (userRole === Role.STUDENT) {
        // Get student ID from user
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!student) {
          res.status(404).json({
            success: false,
            error: {
              code: 'STUDENT_NOT_FOUND',
              message: 'Student profile not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        studentId = student.id;
      } else if (userRole === Role.PARENT) {
        // Parent must specify which child
        if (!childId || typeof childId !== 'string') {
          res.status(400).json({
            success: false,
            error: {
              code: 'CHILD_ID_REQUIRED',
              message: 'Valid child ID is required for parent users',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Verify parent-child relationship
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: childId },
              select: { id: true },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You are not authorized to update this child\'s progress',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        studentId = childId;
      } else if (userRole === Role.TEACHER) {
        // Teachers can update completion for students in their courses
        if (!childId || typeof childId !== 'string') {
          res.status(400).json({
            success: false,
            error: {
              code: 'STUDENT_ID_REQUIRED',
              message: 'Student ID is required for teacher users',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validation will be done in the service layer
        studentId = childId;
      } else if (userRole === Role.ADMIN) {
        // Admins can update any student's completion
        if (!childId || typeof childId !== 'string') {
          res.status(400).json({
            success: false,
            error: {
              code: 'STUDENT_ID_REQUIRED',
              message: 'Student ID is required for admin users',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        studentId = childId;
      } else {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Invalid user role for lesson completion updates',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Enhanced validation using the new validation service
      const validation = await ProgressService.validateLessonCompletionAccess(
        lessonId,
        studentId,
        userId,
        userRole
      );

      if (!validation.isValid) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_VALIDATION_FAILED',
            message: validation.errorMessage || 'Access validation failed',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const completionData: LessonCompletionRequest = {
        lessonId,
        studentId,
        completed: Boolean(completed),
      };

      const result = await ProgressService.updateLessonCompletion(completionData);

      res.status(200).json({
        success: true,
        data: {
          message: `Lesson ${result.toggleAction === 'completed' ? 'marked as completed' : 
                    result.toggleAction === 'uncompleted' ? 'marked as uncompleted' : 
                    'completion status unchanged'}`,
          lessonCompletion: {
            lessonId: result.lessonId,
            studentId: result.studentId,
            completed: result.completed,
            completedAt: result.completedAt,
            previousStatus: result.previousStatus,
            toggleAction: result.toggleAction,
            firstCompletedAt: result.firstCompletedAt,
            lastModifiedAt: result.lastModifiedAt,
          },
          courseProgress: result.courseProgress,
          analytics: {
            progressImprovement: result.courseProgress.progressPercentage - 
              (result.previousStatus === result.completed ? 0 : 
               result.completed ? 
                 Math.round(100 / result.courseProgress.totalLessons) : 
                 -Math.round(100 / result.courseProgress.totalLessons)),
            isNewCompletion: result.toggleAction === 'completed',
            isUncompletion: result.toggleAction === 'uncompleted',
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Update lesson completion error:', error);
      
      // Enhanced error handling with specific error codes
      let statusCode = 500;
      let errorCode = 'UPDATE_COMPLETION_ERROR';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'RESOURCE_NOT_FOUND';
      } else if (error.message.includes('not enrolled') || error.message.includes('Access denied')) {
        statusCode = 403;
        errorCode = 'ACCESS_DENIED';
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
        errorCode = 'INVALID_INPUT';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message || 'Failed to update lesson completion',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get course progress for student
   * GET /api/progress/course/:courseId/student/:studentId
   */
  static async getCourseProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check
      if (userRole === Role.STUDENT) {
        // Students can only view their own progress
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own progress',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        // Parents can only view their children's progress
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s progress',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.TEACHER) {
        // Teachers can view progress for students in their courses
        const { prisma } = require('../config/database');
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
          include: {
            courses: {
              where: { id: courseId },
            },
          },
        });

        if (!teacher || teacher.courses.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_COURSE_ACCESS',
              message: 'You can only view progress for your assigned courses',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      // Admins can view any progress

      const progress = await ProgressService.getCourseProgress(courseId, studentId);

      res.status(200).json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get course progress error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PROGRESS_ERROR',
          message: error.message || 'Failed to get course progress',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get student progress summary
   * GET /api/progress/student/:studentId/summary
   */
  static async getStudentProgressSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check (same as getCourseProgress)
      if (userRole === Role.STUDENT) {
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own progress',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s progress',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const progressSummary = await ProgressService.getStudentProgressSummary(studentId);

      res.status(200).json({
        success: true,
        data: progressSummary,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get student progress summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PROGRESS_SUMMARY_ERROR',
          message: error.message || 'Failed to get student progress summary',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get parent progress view (all children)
   * GET /api/progress/parent/children
   */
  static async getParentProgressView(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== Role.PARENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access this endpoint',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get parent ID
      const { prisma } = require('../config/database');
      const parent = await prisma.parent.findUnique({
        where: { userId },
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const childrenProgress = await ProgressService.getParentProgressView(parent.id);

      res.status(200).json({
        success: true,
        data: childrenProgress,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get parent progress view error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PARENT_PROGRESS_ERROR',
          message: error.message || 'Failed to get parent progress view',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get teacher progress overview
   * GET /api/progress/teacher/overview
   */
  static async getTeacherProgressOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== Role.TEACHER && userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only teachers and admins can access this endpoint',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let teacherId: string;

      if (userRole === Role.TEACHER) {
        // Get teacher ID
        const { prisma } = require('../config/database');
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
        });

        if (!teacher) {
          res.status(404).json({
            success: false,
            error: {
              code: 'TEACHER_NOT_FOUND',
              message: 'Teacher profile not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        teacherId = teacher.id;
      } else {
        // Admin can specify teacher ID or get all
        const { teacherId: paramTeacherId } = req.query;
        
        if (!paramTeacherId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'TEACHER_ID_REQUIRED',
              message: 'Teacher ID is required for admin users',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        teacherId = paramTeacherId as string;
      }

      const progressOverview = await ProgressService.getTeacherProgressOverview(teacherId);

      res.status(200).json({
        success: true,
        data: progressOverview,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get teacher progress overview error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TEACHER_PROGRESS_ERROR',
          message: error.message || 'Failed to get teacher progress overview',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get course completion statistics
   * GET /api/progress/course/:courseId/stats
   */
  static async getCourseCompletionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check - only teachers of the course and admins
      if (userRole === Role.TEACHER) {
        const { prisma } = require('../config/database');
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
          include: {
            courses: {
              where: { id: courseId },
            },
          },
        });

        if (!teacher || teacher.courses.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_COURSE_ACCESS',
              message: 'You can only view statistics for your assigned courses',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only teachers and admins can view course statistics',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const stats = await ProgressService.getCourseCompletionStats(courseId);

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get course completion stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_COURSE_STATS_ERROR',
          message: error.message || 'Failed to get course completion statistics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get recent lesson completions for student
   * GET /api/progress/student/:studentId/recent-completions
   */
  static async getRecentCompletions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { limit } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check (same as other student-specific endpoints)
      if (userRole === Role.STUDENT) {
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own completions',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s completions',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const limitNumber = limit ? parseInt(limit as string, 10) : 10;
      const recentCompletions = await ProgressService.getRecentCompletions(studentId, limitNumber);

      res.status(200).json({
        success: true,
        data: recentCompletions,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get recent completions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RECENT_COMPLETIONS_ERROR',
          message: error.message || 'Failed to get recent completions',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get lesson completion status
   * GET /api/progress/lesson/:lessonId/student/:studentId/status
   */
  static async getLessonCompletionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lessonId, studentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check (same as other endpoints)
      if (userRole === Role.STUDENT) {
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own completion status',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s completion status',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const completionDetails = await ProgressService.getLessonCompletionDetails(lessonId, studentId);

      res.status(200).json({
        success: true,
        data: completionDetails,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get lesson completion status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_COMPLETION_STATUS_ERROR',
          message: error.message || 'Failed to get lesson completion status',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed course completion analytics
   * GET /api/progress/course/:courseId/analytics
   */
  static async getCourseCompletionAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { studentId } = req.query;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check
      if (userRole === Role.TEACHER) {
        const { prisma } = require('../config/database');
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
          include: {
            courses: {
              where: { id: courseId },
            },
          },
        });

        if (!teacher || teacher.courses.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_COURSE_ACCESS',
              message: 'You can only view analytics for your assigned courses',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.STUDENT) {
        // Students can only view their own analytics
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || (studentId && student.id !== studentId)) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // For students, force studentId to be their own ID
        req.query.studentId = student.id;
      } else if (userRole === Role.PARENT && studentId) {
        // Parents can view their children's analytics
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId as string },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      // Admins can view any analytics

      const analytics = await ProgressService.calculateCourseCompletionAnalytics(
        courseId, 
        studentId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get course completion analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ANALYTICS_ERROR',
          message: error.message || 'Failed to get course completion analytics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed progress analytics for a course and student
   * GET /api/progress/course/:courseId/student/:studentId/detailed-analytics
   */
  static async getDetailedProgressAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check (same as other endpoints)
      if (userRole === Role.STUDENT) {
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own detailed analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s detailed analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.TEACHER) {
        const { prisma } = require('../config/database');
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
          include: {
            courses: {
              where: { id: courseId },
            },
          },
        });

        if (!teacher || teacher.courses.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_COURSE_ACCESS',
              message: 'You can only view detailed analytics for your assigned courses',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const detailedAnalytics = await ProgressService.calculateDetailedProgressAnalytics(
        courseId,
        studentId
      );

      res.status(200).json({
        success: true,
        data: detailedAnalytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get detailed progress analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_DETAILED_ANALYTICS_ERROR',
          message: error.message || 'Failed to get detailed progress analytics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get bulk progress analytics for all student's courses
   * GET /api/progress/student/:studentId/bulk-analytics
   */
  static async getBulkProgressAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Authorization check
      if (userRole === Role.STUDENT) {
        const { prisma } = require('../config/database');
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || student.id !== studentId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_ACCESS',
              message: 'You can only view your own bulk analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else if (userRole === Role.PARENT) {
        const { prisma } = require('../config/database');
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED_CHILD_ACCESS',
              message: 'You can only view your children\'s bulk analytics',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const bulkAnalytics = await ProgressService.calculateBulkProgressAnalytics(studentId);

      res.status(200).json({
        success: true,
        data: bulkAnalytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get bulk progress analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_BULK_ANALYTICS_ERROR',
          message: error.message || 'Failed to get bulk progress analytics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed parent progress report
  /**
   * Get detailed parent progress report
   * GET /api/progress/parent/detailed-report
   */
  static async getDetailedParentProgressReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== Role.PARENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access detailed progress reports',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get parent ID
      const { prisma } = require('../config/database');
      const parent = await prisma.parent.findUnique({
        where: { userId },
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const detailedReport = await ProgressService.getDetailedParentProgressReport(parent.id);

      res.status(200).json({
        success: true,
        data: detailedReport,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get detailed parent progress report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_DETAILED_REPORT_ERROR',
          message: error.message || 'Failed to get detailed progress report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get children progress comparison for parents
   * GET /api/progress/parent/children-comparison
   */
  static async getChildrenProgressComparison(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== Role.PARENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access children progress comparison',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get parent ID
      const { prisma } = require('../config/database');
      const parent = await prisma.parent.findUnique({
        where: { userId },
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const comparison = await ProgressService.getChildrenProgressComparison(parent.id);

      res.status(200).json({
        success: true,
        data: comparison,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get children progress comparison error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_COMPARISON_ERROR',
          message: error.message || 'Failed to get children progress comparison',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Export parent progress data
   * GET /api/progress/parent/export
   */
  static async exportParentProgressData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { format = 'json', startDate, endDate } = req.query;

      if (userRole !== Role.PARENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can export progress data',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate format
      if (!['json', 'csv', 'pdf'].includes(format as string)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be json, csv, or pdf',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get parent ID
      const { prisma } = require('../config/database');
      const parent = await prisma.parent.findUnique({
        where: { userId },
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Parse date range if provided
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        };

        // Validate dates
        if (isNaN(dateRange.startDate.getTime()) || isNaN(dateRange.endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE_RANGE',
              message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (dateRange.startDate > dateRange.endDate) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE_RANGE',
              message: 'Start date must be before end date',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const exportData = await ProgressService.exportParentProgressData(
        parent.id,
        format as 'json' | 'csv' | 'pdf',
        dateRange
      );

      // Set appropriate headers based on format
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
          break;
        case 'pdf':
          res.setHeader('Content-Type', 'application/json'); // PDF data structure
          res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
          break;
      }

      res.status(200).json({
        success: true,
        data: exportData,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Export parent progress data error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error.message || 'Failed to export progress data',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get parent progress notifications
   * GET /api/progress/parent/notifications
   */
  static async getParentProgressNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== Role.PARENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only parents can access progress notifications',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get parent ID
      const { prisma } = require('../config/database');
      const parent = await prisma.parent.findUnique({
        where: { userId },
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'Parent profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const notifications = await ProgressService.getParentProgressNotifications(parent.id);

      res.status(200).json({
        success: true,
        data: notifications,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Get parent progress notifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_NOTIFICATIONS_ERROR',
          message: error.message || 'Failed to get progress notifications',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}