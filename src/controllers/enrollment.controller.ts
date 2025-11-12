import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.types";
import {
  EnrollmentService,
  BulkEnrollmentRequestData,
} from "../services/enrollment.service";
import { prisma } from "../config/database";
import {
  createEnrollmentRequestSchema,
  bulkProcessEnrollmentRequestsSchema,
  enrollmentRequestQuerySchema,
  approveRejectRequestSchema,
} from "../schemas/enrollment.schema";

export class EnrollmentController {
  /**
   * Create enrollment request (Student only)
   */
  static async createEnrollmentRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = createEnrollmentRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: courseId } = validation.data.params;
      const { message } = validation.data.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "STUDENT") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only students can create enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get student profile
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student profile not found",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const enrollmentRequest = await EnrollmentService.createEnrollmentRequest(
        {
          studentId: student.id,
          courseId,
          message,
        }
      );

      res.status(201).json({
        success: true,
        data: enrollmentRequest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Create enrollment request error:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("already enrolled") ||
          error.message.includes("already exists")
        ) {
          return res.status(409).json({
            success: false,
            error: {
              code: "CONFLICT",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (error.message.includes("not found")) {
          return res.status(404).json({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create enrollment request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment requests (Admin only, or student's own requests)
   */
  static async getEnrollmentRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = enrollmentRequestQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: validation.error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;
      const filters = validation.data;

      // If not admin, only allow students to see their own requests
      if (userRole === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            error: {
              code: "STUDENT_NOT_FOUND",
              message: "Student profile not found",
            },
            timestamp: new Date().toISOString(),
          });
        }

        filters.studentId = student.id;
      } else if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins and students can view enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await EnrollmentService.getEnrollmentRequests(filters);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get enrollment requests error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollment requests",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment request by ID (Admin only, or student's own request)
   */
  static async getEnrollmentRequestById(req: AuthenticatedRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const request = await EnrollmentService.getEnrollmentRequestById(
        requestId
      );

      // Check permissions
      if (userRole === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId },
        });

        if (!student || request.studentId !== student.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: "You can only view your own enrollment requests",
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins and students can view enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: request,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get enrollment request by ID error:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollment request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Approve enrollment request (Admin only)
   */
  static async approveEnrollmentRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const validation = approveRejectRequestSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { adminNote } = validation.data;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can approve enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const request = await EnrollmentService.approveEnrollmentRequest(
        requestId,
        adminNote,
        userId
      );

      res.json({
        success: true,
        data: request,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Approve enrollment request error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (
          error.message.includes("Only pending") ||
          error.message.includes("already enrolled")
        ) {
          return res.status(409).json({
            success: false,
            error: {
              code: "CONFLICT",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve enrollment request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reject enrollment request (Admin only)
   */
  static async rejectEnrollmentRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const validation = approveRejectRequestSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { adminNote } = validation.data;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can reject enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const request = await EnrollmentService.rejectEnrollmentRequest(
        requestId,
        adminNote,
        userId
      );

      res.json({
        success: true,
        data: request,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Reject enrollment request error:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (error.message.includes("Only pending")) {
          return res.status(409).json({
            success: false,
            error: {
              code: "CONFLICT",
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reject enrollment request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Bulk process enrollment requests (Admin only)
   */
  static async bulkProcessEnrollmentRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = bulkProcessEnrollmentRequestsSchema.safeParse(
        req.body
      );
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error.errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can bulk process enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { requestIds, action, adminNote } = validation.data;

      const bulkData: BulkEnrollmentRequestData = {
        requestIds,
        action,
        adminNote,
        reviewedBy: userId!,
      };

      const result = await EnrollmentService.bulkProcessEnrollmentRequests(
        bulkData
      );

      // Return appropriate status code based on results
      let statusCode = 200;
      if (result.failureCount > 0 && result.successCount === 0) {
        statusCode = 400; // All failed
      } else if (result.failureCount > 0) {
        statusCode = 207; // Partial success (Multi-Status)
      }

      res.status(statusCode).json({
        success: result.successCount > 0,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Bulk process enrollment requests error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk process enrollment requests",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get pending requests count (Admin only)
   */
  static async getPendingRequestsCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can view pending requests count",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const count = await EnrollmentService.getPendingRequestsCount();

      res.json({
        success: true,
        data: { count },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get pending requests count error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get pending requests count",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment request statistics (Admin only)
   */
  static async getEnrollmentRequestStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can view enrollment request statistics",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const statistics =
        await EnrollmentService.getEnrollmentRequestStatistics();

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get enrollment request statistics error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollment request statistics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete enrollment request (Admin only)
   */
  static async deleteEnrollmentRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const userRole = req.user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only admins can delete enrollment requests",
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
          timestamp: new Date().toISOString(),
        });
      }

      await EnrollmentService.deleteEnrollmentRequest(requestId);

      res.status(204).send();
    } catch (error) {
      console.error("Delete enrollment request error:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete enrollment request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current user's enrollment requests (Student only)
   */
  static async getMyEnrollmentRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "STUDENT") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only students can access this endpoint",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get student profile
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student profile not found",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get student's enrollment requests
      const requests = await prisma.enrollmentRequest.findMany({
        where: { studentId: student.id },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: requests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get my enrollment requests error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollment requests",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current user's enrollments (Student only)
   */
  static async getMyEnrollments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (userRole !== "STUDENT") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only students can access this endpoint",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get student profile
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student profile not found",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get student's enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        data: enrollments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get my enrollments error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get enrollments",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
