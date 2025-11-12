import { z } from 'zod';

// Enhanced lesson completion update schema with better validation
const updateLessonCompletionSchema = z.object({
  body: z.object({
    lessonId: z.string()
      .uuid('Invalid lesson ID format')
      .min(1, 'Lesson ID cannot be empty'),
    completed: z.boolean({
      required_error: 'Completion status is required',
      invalid_type_error: 'Completion status must be a boolean value',
    }),
    childId: z.string()
      .uuid('Invalid child/student ID format')
      .min(1, 'Child/student ID cannot be empty')
      .optional(),
  }),
});

// Course progress parameters schema
const getCourseProgressSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

// Student progress parameters schema
const getStudentProgressSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

// Course stats parameters schema
const getCourseStatsSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
  }),
});

// Recent completions schema
const getRecentCompletionsSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().transform((val) => {
      if (val) {
        const num = parseInt(val, 10);
        return num >= 1 && num <= 50 ? num : 10;
      }
      return 10;
    }),
  }).optional(),
});

// Lesson completion status schema
const getLessonStatusSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid('Invalid lesson ID format'),
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

// Teacher overview query schema
const getTeacherOverviewSchema = z.object({
  query: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format').optional(),
  }).optional(),
});

// Course analytics parameters schema
const getCourseAnalyticsSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
  }),
});

// Detailed analytics parameters schema
const getDetailedAnalyticsSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

// Bulk analytics parameters schema
const getBulkAnalyticsSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

// Parent export data schema
const exportParentProgressSchema = z.object({
  query: z.object({
    format: z.enum(['json', 'csv', 'pdf'], {
      errorMap: () => ({ message: 'Format must be json, csv, or pdf' }),
    }).default('json'),
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  }, {
    message: 'Start date must be before or equal to end date',
  }).refine((data) => {
    // Both dates must be provided together or not at all
    return (data.startDate && data.endDate) || (!data.startDate && !data.endDate);
  }, {
    message: 'Both start date and end date must be provided together',
  }),
});

export const progressSchemas = {
  updateLessonCompletion: updateLessonCompletionSchema,
  getCourseProgress: getCourseProgressSchema,
  getStudentProgress: getStudentProgressSchema,
  getCourseStats: getCourseStatsSchema,
  getRecentCompletions: getRecentCompletionsSchema,
  getLessonStatus: getLessonStatusSchema,
  getTeacherOverview: getTeacherOverviewSchema,
  getCourseAnalytics: getCourseAnalyticsSchema,
  getDetailedAnalytics: getDetailedAnalyticsSchema,
  getBulkAnalytics: getBulkAnalyticsSchema,
  exportParentProgress: exportParentProgressSchema,
};

// Type exports for TypeScript
export type UpdateLessonCompletionRequest = z.infer<typeof updateLessonCompletionSchema>;
export type GetCourseProgressRequest = z.infer<typeof getCourseProgressSchema>;
export type GetStudentProgressRequest = z.infer<typeof getStudentProgressSchema>;
export type GetCourseStatsRequest = z.infer<typeof getCourseStatsSchema>;
export type GetRecentCompletionsRequest = z.infer<typeof getRecentCompletionsSchema>;
export type GetLessonStatusRequest = z.infer<typeof getLessonStatusSchema>;
export type GetTeacherOverviewRequest = z.infer<typeof getTeacherOverviewSchema>;
export type GetCourseAnalyticsRequest = z.infer<typeof getCourseAnalyticsSchema>;
export type GetDetailedAnalyticsRequest = z.infer<typeof getDetailedAnalyticsSchema>;
export type GetBulkAnalyticsRequest = z.infer<typeof getBulkAnalyticsSchema>;
export type ExportParentProgressRequest = z.infer<typeof exportParentProgressSchema>;