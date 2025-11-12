import { z } from 'zod';

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z.object({
    fieldname: z.string(),
    originalname: z.string().min(1, 'Original filename is required'),
    encoding: z.string(),
    mimetype: z.string().refine(
      (mimeType) => [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/webm',
      ].includes(mimeType),
      'Invalid file type'
    ),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
    destination: z.string(),
    filename: z.string(),
    path: z.string(),
  }),
});

// Multiple files upload validation schema
export const multipleFilesUploadSchema = z.object({
  files: z.array(fileUploadSchema.shape.file).max(5, 'Maximum 5 files allowed'),
});

// File query parameters schema
export const fileQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
  mimeType: z.string().optional(),
  search: z.string().optional(),
});

// File ID parameter schema
export const fileIdSchema = z.object({
  id: z.string().uuid('Invalid file ID format'),
});

// File serve parameters schema
export const fileServeSchema = z.object({
  category: z.enum(['pdfs', 'images', 'videos', 'temp']),
  filename: z.string().min(1, 'Filename is required'),
});

// File metadata response schema
export const fileMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  uploader: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// File stats response schema
export const fileStatsSchema = z.object({
  totalFiles: z.number(),
  totalSize: z.number(),
  filesByType: z.array(z.object({
    mimeType: z.string(),
    count: z.number(),
    size: z.number(),
  })),
});

// Validation error schema
export const fileValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string(),
});

// Success response schema
export const fileSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  timestamp: z.string(),
});

// Upload progress schema
export const uploadProgressSchema = z.object({
  uploadId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  totalSize: z.number(),
  uploadedSize: z.number(),
  startedAt: z.date(),
  estimatedTimeRemaining: z.number(),
});

// Bulk operations schemas
export const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkMoveSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50),
  targetCategory: z.enum(['pdfs', 'images', 'videos', 'temp']),
});

export const bulkOperationResultSchema = z.object({
  successful: z.number(),
  failed: z.number(),
  total: z.number(),
  details: z.object({
    processed: z.array(z.string()),
    failed: z.array(z.object({
      id: z.string(),
      error: z.string(),
    })),
  }),
});

// Advanced search schema
export const fileSearchSchema = z.object({
  q: z.string().optional(),
  mimeType: z.string().optional(),
  category: z.enum(['pdfs', 'images', 'videos', 'temp']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
  uploadedBy: z.string().uuid().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

// Detailed file metadata schema
export const detailedFileMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  sizeFormatted: z.string(),
  path: z.string(),
  url: z.string().url(),
  cdnUrl: z.string().url().optional(),
  category: z.string(),
  uploader: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  fileExists: z.boolean(),
  lastModified: z.date().optional(),
  lastAccessed: z.date().optional(),
  permissions: z.number().optional(),
  isPublic: z.boolean(),
  downloadCount: z.number(),
  tags: z.array(z.string()),
});

// File search result schema
export const fileSearchResultSchema = z.object({
  files: z.array(detailedFileMetadataSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  filters: fileSearchSchema,
});

// Type exports
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type MultipleFilesUploadData = z.infer<typeof multipleFilesUploadSchema>;
export type FileQueryParams = z.infer<typeof fileQuerySchema>;
export type FileIdParams = z.infer<typeof fileIdSchema>;
export type FileServeParams = z.infer<typeof fileServeSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type FileStats = z.infer<typeof fileStatsSchema>;
export type FileValidationError = z.infer<typeof fileValidationErrorSchema>;
export type FileSuccessResponse = z.infer<typeof fileSuccessResponseSchema>;
export type UploadProgress = z.infer<typeof uploadProgressSchema>;
export type BulkDeleteRequest = z.infer<typeof bulkDeleteSchema>;
export type BulkMoveRequest = z.infer<typeof bulkMoveSchema>;
export type BulkOperationResult = z.infer<typeof bulkOperationResultSchema>;
export type FileSearchParams = z.infer<typeof fileSearchSchema>;
export type DetailedFileMetadata = z.infer<typeof detailedFileMetadataSchema>;
export type FileSearchResult = z.infer<typeof fileSearchResultSchema>;