import { z } from 'zod';

// Course Schemas
export const createCourseSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming'),
    description: z.string()
      .max(5000, 'Description must be less than 5000 characters')
      .trim()
      .optional(),
    teacherId: z.string()
      .uuid('Invalid teacher ID')
      .optional(),
  }),
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid course ID'),
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming')
      .optional(),
    description: z.string()
      .max(5000, 'Description must be less than 5000 characters')
      .trim()
      .optional(),
  }),
});

export const getCourseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid course ID'),
  }),
});

export const getCoursesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    teacherId: z.string().uuid('Invalid teacher ID').optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).optional(),
  }),
});

export const assignTeacherSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    teacherId: z.string().uuid('Invalid teacher ID'),
  }),
});

// Section Schemas
export const createSectionSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming'),
    courseId: z.string().uuid('Invalid course ID'),
    order: z.number()
      .int('Order must be an integer')
      .min(0, 'Order must be non-negative')
      .max(1000, 'Order cannot exceed 1000')
      .optional(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid section ID'),
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming')
      .optional(),
    order: z.number()
      .int('Order must be an integer')
      .min(0, 'Order must be non-negative')
      .max(1000, 'Order cannot exceed 1000')
      .optional(),
  }),
});

export const getSectionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid section ID'),
  }),
});

// Lesson Schemas
export const createLessonSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming'),
    content: z.string()
      .max(10000, 'Content must be less than 10000 characters')
      .trim()
      .optional(),
    videoUrl: z.string()
      .url('Invalid video URL')
      .max(500, 'Video URL must be less than 500 characters')
      .optional(),
    pdfUrl: z.string()
      .url('Invalid PDF URL')
      .max(500, 'PDF URL must be less than 500 characters')
      .optional(),
    sectionId: z.string().uuid('Invalid section ID'),
    order: z.number()
      .int('Order must be an integer')
      .min(0, 'Order must be non-negative')
      .max(1000, 'Order cannot exceed 1000')
      .optional(),
  }),
});

export const updateLessonSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lesson ID'),
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .refine(val => val.length > 0, 'Title cannot be empty after trimming')
      .optional(),
    content: z.string()
      .max(10000, 'Content must be less than 10000 characters')
      .trim()
      .optional(),
    videoUrl: z.string()
      .url('Invalid video URL')
      .max(500, 'Video URL must be less than 500 characters')
      .optional(),
    pdfUrl: z.string()
      .url('Invalid PDF URL')
      .max(500, 'PDF URL must be less than 500 characters')
      .optional(),
    order: z.number()
      .int('Order must be an integer')
      .min(0, 'Order must be non-negative')
      .max(1000, 'Order cannot exceed 1000')
      .optional(),
  }),
});

export const getLessonSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lesson ID'),
  }),
});

// Enrollment Schemas
export const enrollStudentSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    studentId: z.string().uuid('Invalid student ID').optional(),
  }),
});

export const unenrollStudentSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    studentId: z.string().uuid('Invalid student ID'),
  }),
});

export const getCourseEnrollmentsSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID'),
  }),
});

export const getStudentEnrollmentsSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID'),
  }),
});

export const getCourseProgressSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    studentId: z.string().uuid('Invalid student ID'),
  }),
});

// Lesson Completion Schemas
export const markLessonCompleteSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid('Invalid lesson ID'),
  }),
});

export const markLessonIncompleteSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid('Invalid lesson ID'),
  }),
});

// Bulk Operations Schemas
export const bulkEnrollSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student ID is required'),
  }),
});

export const bulkUnenrollSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID'),
    studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student ID is required'),
  }),
});

// Type exports
export type CreateCourseRequest = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseRequest = z.infer<typeof updateCourseSchema>['body'];
export type GetCourseRequest = z.infer<typeof getCourseSchema>['params'];
export type GetCoursesRequest = z.infer<typeof getCoursesSchema>['query'];
export type AssignTeacherRequest = z.infer<typeof assignTeacherSchema>['body'];

export type CreateSectionRequest = z.infer<typeof createSectionSchema>['body'];
export type UpdateSectionRequest = z.infer<typeof updateSectionSchema>['body'];
export type GetSectionRequest = z.infer<typeof getSectionSchema>['params'];

export type CreateLessonRequest = z.infer<typeof createLessonSchema>['body'];
export type UpdateLessonRequest = z.infer<typeof updateLessonSchema>['body'];
export type GetLessonRequest = z.infer<typeof getLessonSchema>['params'];

export type EnrollStudentRequest = z.infer<typeof enrollStudentSchema>['body'];
export type UnenrollStudentRequest = z.infer<typeof unenrollStudentSchema>['body'];
export type GetCourseEnrollmentsRequest = z.infer<typeof getCourseEnrollmentsSchema>['params'];
export type GetStudentEnrollmentsRequest = z.infer<typeof getStudentEnrollmentsSchema>['params'];
export type GetCourseProgressRequest = z.infer<typeof getCourseProgressSchema>['params'];

export type MarkLessonCompleteRequest = z.infer<typeof markLessonCompleteSchema>['params'];
export type MarkLessonIncompleteRequest = z.infer<typeof markLessonIncompleteSchema>['params'];

export type BulkEnrollRequest = z.infer<typeof bulkEnrollSchema>['body'];
export type BulkUnenrollRequest = z.infer<typeof bulkUnenrollSchema>['body'];