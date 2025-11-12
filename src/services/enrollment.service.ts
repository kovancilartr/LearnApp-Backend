import { prisma } from "../config/database";
import { EnrollmentStatus, Role } from "@prisma/client";
import { NotificationService } from "./notification.service";

export interface CreateEnrollmentRequestData {
  studentId: string;
  courseId: string;
  message?: string;
}

export interface BulkEnrollmentRequestData {
  requestIds: string[];
  action: 'approve' | 'reject';
  adminNote?: string;
  reviewedBy: string;
}

export interface EnrollmentRequestWithDetails {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  message?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  course: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    requestId: string;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface EnrollmentRequestStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  requestsByMonth: Array<{
    month: string;
    count: number;
  }>;
  requestsByCourse: Array<{
    courseId: string;
    courseTitle: string;
    count: number;
  }>;
  recentRequests: EnrollmentRequestWithDetails[];
}

export class EnrollmentService {
  /**
   * Create enrollment request
   */
  static async createEnrollmentRequest(
    data: CreateEnrollmentRequestData
  ): Promise<EnrollmentRequestWithDetails> {
    try {
      const { studentId, courseId, message } = data;

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      // Check if request already exists
      const existingRequest = await prisma.enrollmentRequest.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingRequest) {
        throw new Error("Enrollment request already exists for this course");
      }

      const enrollmentRequest = await prisma.enrollmentRequest.create({
        data: {
          studentId,
          courseId,
          message: message?.trim(),
          status: EnrollmentStatus.PENDING,
        },
        include: {
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      return enrollmentRequest as EnrollmentRequestWithDetails;
    } catch (error) {
      console.error("Create enrollment request error:", error);
      throw error;
    }
  }

  /**
   * Get all enrollment requests with filtering and pagination
   */
  static async getEnrollmentRequests(filters?: {
    status?: EnrollmentStatus;
    courseId?: string;
    studentId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    items: EnrollmentRequestWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        status,
        courseId,
        studentId,
        search,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters || {};

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (courseId) {
        where.courseId = courseId;
      }

      if (studentId) {
        where.studentId = studentId;
      }

      if (search) {
        where.student = {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        };
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Determine sort order
      let orderBy: any = {};
      switch (sortBy) {
        case 'studentName':
          orderBy = {
            student: {
              user: {
                name: sortOrder,
              },
            },
          };
          break;
        case 'courseTitle':
          orderBy = {
            course: {
              title: sortOrder,
            },
          };
          break;
        default:
          orderBy = {
            [sortBy]: sortOrder,
          };
      }

      // Get total count for pagination
      const total = await prisma.enrollmentRequest.count({ where });

      // Get paginated results
      const requests = await prisma.enrollmentRequest.findMany({
        where,
        include: {
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        items: requests as EnrollmentRequestWithDetails[],
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error("Get enrollment requests error:", error);
      throw error;
    }
  }

  /**
   * Get enrollment request by ID
   */
  static async getEnrollmentRequestById(
    requestId: string
  ): Promise<EnrollmentRequestWithDetails> {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      return request as EnrollmentRequestWithDetails;
    } catch (error) {
      console.error("Get enrollment request by ID error:", error);
      throw error;
    }
  }

  /**
   * Approve single enrollment request
   */
  static async approveEnrollmentRequest(
    requestId: string,
    adminNote?: string,
    reviewedBy?: string
  ): Promise<EnrollmentRequestWithDetails> {
    try {
      const request = await this.getEnrollmentRequestById(requestId);

      if (request.status !== EnrollmentStatus.PENDING) {
        throw new Error("Only pending requests can be approved");
      }

      // Check if student is already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: request.studentId,
            courseId: request.courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update request status
        const updatedRequest = await tx.enrollmentRequest.update({
          where: { id: requestId },
          data: {
            status: EnrollmentStatus.APPROVED,
            adminNote: adminNote?.trim(),
            reviewedBy,
            reviewedAt: new Date(),
          },
          include: {
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
            course: {
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        });

        // Create enrollment
        await tx.enrollment.create({
          data: {
            studentId: request.studentId,
            courseId: request.courseId,
          },
        });

        return updatedRequest;
      });

      // Send notification to student
      await NotificationService.createNotification({
        userId: request.student.user.id,
        title: "Enrollment Approved",
        message: `Your enrollment request for "${request.course.title}" has been approved.`,
        type: "ENROLLMENT_APPROVED",
      });

      return result as EnrollmentRequestWithDetails;
    } catch (error) {
      console.error("Approve enrollment request error:", error);
      throw error;
    }
  }

  /**
   * Reject single enrollment request
   */
  static async rejectEnrollmentRequest(
    requestId: string,
    adminNote?: string,
    reviewedBy?: string
  ): Promise<EnrollmentRequestWithDetails> {
    try {
      const request = await this.getEnrollmentRequestById(requestId);

      if (request.status !== EnrollmentStatus.PENDING) {
        throw new Error("Only pending requests can be rejected");
      }

      const updatedRequest = await prisma.enrollmentRequest.update({
        where: { id: requestId },
        data: {
          status: EnrollmentStatus.REJECTED,
          adminNote: adminNote?.trim(),
          reviewedBy,
          reviewedAt: new Date(),
        },
        include: {
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      // Send notification to student
      await NotificationService.createNotification({
        userId: request.student.user.id,
        title: "Enrollment Rejected",
        message: `Your enrollment request for "${request.course.title}" has been rejected.${
          adminNote ? ` Reason: ${adminNote}` : ""
        }`,
        type: "ENROLLMENT_REJECTED",
      });

      return updatedRequest as EnrollmentRequestWithDetails;
    } catch (error) {
      console.error("Reject enrollment request error:", error);
      throw error;
    }
  }

  /**
   * Bulk approve/reject enrollment requests
   */
  static async bulkProcessEnrollmentRequests(
    data: BulkEnrollmentRequestData
  ): Promise<BulkOperationResult> {
    try {
      const { requestIds, action, adminNote, reviewedBy } = data;

      if (!requestIds || requestIds.length === 0) {
        throw new Error("No request IDs provided");
      }

      if (!["approve", "reject"].includes(action)) {
        throw new Error("Invalid action. Must be 'approve' or 'reject'");
      }

      const result: BulkOperationResult = {
        successful: [],
        failed: [],
        totalProcessed: requestIds.length,
        successCount: 0,
        failureCount: 0,
      };

      // Process each request individually to handle partial failures
      for (const requestId of requestIds) {
        try {
          if (action === "approve") {
            await this.approveEnrollmentRequest(requestId, adminNote, reviewedBy);
          } else {
            await this.rejectEnrollmentRequest(requestId, adminNote, reviewedBy);
          }
          
          result.successful.push(requestId);
          result.successCount++;
        } catch (error) {
          console.error(`Failed to ${action} request ${requestId}:`, error);
          result.failed.push({
            requestId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          result.failureCount++;
        }
      }

      return result;
    } catch (error) {
      console.error("Bulk process enrollment requests error:", error);
      throw error;
    }
  }

  /**
   * Get pending enrollment requests count
   */
  static async getPendingRequestsCount(): Promise<number> {
    try {
      return await prisma.enrollmentRequest.count({
        where: {
          status: EnrollmentStatus.PENDING,
        },
      });
    } catch (error) {
      console.error("Get pending requests count error:", error);
      throw error;
    }
  }

  /**
   * Get enrollment request statistics
   */
  static async getEnrollmentRequestStatistics(): Promise<EnrollmentRequestStatistics> {
    try {
      // Get total counts by status
      const [totalRequests, pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
        prisma.enrollmentRequest.count(),
        prisma.enrollmentRequest.count({ where: { status: EnrollmentStatus.PENDING } }),
        prisma.enrollmentRequest.count({ where: { status: EnrollmentStatus.APPROVED } }),
        prisma.enrollmentRequest.count({ where: { status: EnrollmentStatus.REJECTED } }),
      ]);

      // Get requests by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const requestsByMonth = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*) as count
        FROM "enrollment_requests"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 6
      `;

      // Get requests by course (top 10)
      const requestsByCourse = await prisma.enrollmentRequest.groupBy({
        by: ['courseId'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // Get course details for the grouped results
      const courseIds = requestsByCourse.map(item => item.courseId);
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true },
      });

      const requestsByCourseWithDetails = requestsByCourse.map(item => {
        const course = courses.find(c => c.id === item.courseId);
        return {
          courseId: item.courseId,
          courseTitle: course?.title || 'Unknown Course',
          count: item._count.id,
        };
      });

      // Get recent requests (last 10)
      const recentRequestsResult = await this.getEnrollmentRequests({ limit: 10 });
      const recentRequestsLimited = recentRequestsResult.items;

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        requestsByMonth: requestsByMonth.map(item => ({
          month: item.month,
          count: Number(item.count),
        })),
        requestsByCourse: requestsByCourseWithDetails,
        recentRequests: recentRequestsLimited,
      };
    } catch (error) {
      console.error("Get enrollment request statistics error:", error);
      throw error;
    }
  }

  /**
   * Delete enrollment request (for cleanup)
   */
  static async deleteEnrollmentRequest(requestId: string): Promise<void> {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      await prisma.enrollmentRequest.delete({
        where: { id: requestId },
      });
    } catch (error) {
      console.error("Delete enrollment request error:", error);
      throw error;
    }
  }
}