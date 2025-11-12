import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.types";
import { AnalyticsService } from "../services/analytics.service";
import { Role } from "@prisma/client";

export class AnalyticsController {
  /**
   * Get dashboard statistics (Admin only)
   */
  static async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access dashboard statistics",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const stats = await AnalyticsService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get dashboard statistics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get course analytics (Admin only)
   */
  static async getCourseAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access course analytics",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const analytics = await AnalyticsService.getCourseAnalytics();

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get course analytics error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get course analytics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user analytics (Admin only)
   */
  static async getUserAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access user analytics",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const analytics = await AnalyticsService.getUserAnalytics();

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get user analytics error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user analytics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment trends (Admin only)
   */
  static async getEnrollmentTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access enrollment trends",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const trends = await AnalyticsService.getEnrollmentTrends();

      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get enrollment trends error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollment trends",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get system usage statistics (Admin only)
   */
  static async getSystemUsageStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access system usage statistics",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const stats = await AnalyticsService.getSystemUsageStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get system usage stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get system usage statistics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get teacher assignments (Admin only)
   */
  static async getTeacherAssignments(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access teacher assignments",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const assignments = await AnalyticsService.getTeacherAssignments();

      res.json({
        success: true,
        data: assignments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get teacher assignments error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get teacher assignments",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get comprehensive analytics overview (Admin only)
   */
  static async getAnalyticsOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can access analytics overview",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get all analytics data in parallel for better performance
      const [
        overview,
        courses,
        users,
        enrollments,
        teachers,
        usage
      ] = await Promise.all([
        AnalyticsService.getDashboardStats(),
        AnalyticsService.getCourseAnalytics(),
        AnalyticsService.getUserAnalytics(),
        AnalyticsService.getEnrollmentTrends(),
        AnalyticsService.getTeacherAssignments(),
        AnalyticsService.getSystemUsageStats(),
      ]);

      const analyticsOverview = {
        overview,
        courses,
        users,
        enrollments,
        teachers,
        usage,
      };

      res.json({
        success: true,
        data: analyticsOverview,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get analytics overview error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get analytics overview",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Export analytics data (Admin only)
   */
  static async exportAnalyticsData(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can export analytics data",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { type = 'overview', format = 'json' } = req.query;

      let data;
      let filename;

      switch (type) {
        case 'dashboard':
          data = await AnalyticsService.getDashboardStats();
          filename = `dashboard-stats-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'courses':
          data = await AnalyticsService.getCourseAnalytics();
          filename = `course-analytics-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'users':
          data = await AnalyticsService.getUserAnalytics();
          filename = `user-analytics-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'enrollments':
          data = await AnalyticsService.getEnrollmentTrends();
          filename = `enrollment-trends-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'teachers':
          data = await AnalyticsService.getTeacherAssignments();
          filename = `teacher-assignments-${new Date().toISOString().split('T')[0]}`;
          break;
        default:
          // Export comprehensive overview
          const [overview, courses, users, enrollments, teachers] = await Promise.all([
            AnalyticsService.getDashboardStats(),
            AnalyticsService.getCourseAnalytics(),
            AnalyticsService.getUserAnalytics(),
            AnalyticsService.getEnrollmentTrends(),
            AnalyticsService.getTeacherAssignments(),
          ]);
          data = { overview, courses, users, enrollments, teachers };
          filename = `analytics-overview-${new Date().toISOString().split('T')[0]}`;
      }

      if (format === 'csv') {
        // For CSV format, we'll return JSON for now
        // In a real implementation, you'd convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(JSON.stringify(data, null, 2));
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json({
          success: true,
          data,
          exportInfo: {
            type,
            format,
            filename: `${filename}.${format}`,
            generatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Export analytics data error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export analytics data",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}