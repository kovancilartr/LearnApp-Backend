import { z } from "zod";
import { EnrollmentStatus } from "@prisma/client";

export const createEnrollmentRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid course ID"),
  }),
  body: z.object({
    message: z.string().optional(),
  }),
});

export const bulkProcessEnrollmentRequestsSchema = z.object({
  requestIds: z.array(z.string().uuid("Invalid request ID")).min(1, "At least one request ID is required"),
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Action must be 'approve' or 'reject'" }),
  }),
  adminNote: z.string().optional(),
});

export const enrollmentRequestQuerySchema = z.object({
  status: z.nativeEnum(EnrollmentStatus).optional(),
  courseId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  search: z.string().optional(), // For student name search
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'studentName', 'courseTitle']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const approveRejectRequestSchema = z.object({
  adminNote: z.string().optional(),
});

export type CreateEnrollmentRequestInput = z.infer<typeof createEnrollmentRequestSchema>;
export type BulkProcessEnrollmentRequestsInput = z.infer<typeof bulkProcessEnrollmentRequestsSchema>;
export type EnrollmentRequestQueryInput = z.infer<typeof enrollmentRequestQuerySchema>;
export type ApproveRejectRequestInput = z.infer<typeof approveRejectRequestSchema>;