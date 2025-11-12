import { Router } from 'express';
import { z } from 'zod';
import { fileController } from '../controllers/file.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { fileUploadRateLimit } from '../middleware/rate-limit.middleware';
import { trackUploadProgress } from '../middleware/upload-progress.middleware';
import { fileQuerySchema, fileIdSchema, fileServeSchema } from '../schemas/file.schema';

const router = Router();

// All file routes require authentication
router.use(authMiddleware);

// Upload single file
router.post(
  '/upload',
  fileUploadRateLimit,
  trackUploadProgress,
  uploadSingle('file'),
  fileController.uploadFile.bind(fileController)
);

// Upload multiple files
router.post(
  '/upload-multiple',
  fileUploadRateLimit,
  trackUploadProgress,
  uploadMultiple('files', 5),
  fileController.uploadMultipleFiles.bind(fileController)
);

// Get user files with pagination
router.get(
  '/my-files',
  validateRequest({ query: fileQuerySchema }),
  fileController.getUserFiles.bind(fileController)
);

// Get file metadata
router.get(
  '/metadata/:id',
  validateRequest({ params: fileIdSchema }),
  fileController.getFileMetadata.bind(fileController)
);

// Serve file (with access control)
router.get(
  '/:category/:filename',
  validateRequest({ params: fileServeSchema }),
  fileController.serveFile.bind(fileController)
);

// Delete file
router.delete(
  '/:id',
  validateRequest({ params: fileIdSchema }),
  fileController.deleteFile.bind(fileController)
);

// Get file statistics
router.get(
  '/stats',
  fileController.getFileStats.bind(fileController)
);

// Get storage usage (Admin only)
router.get(
  '/storage-usage',
  fileController.getStorageUsage.bind(fileController)
);

// Cleanup orphaned files (Admin only)
router.post(
  '/cleanup/orphaned',
  fileController.cleanupOrphanedFiles.bind(fileController)
);

// Cleanup temporary files (Admin only)
router.post(
  '/cleanup/temp',
  fileController.cleanupTempFiles.bind(fileController)
);

// CDN Management Routes

// Sync single file to CDN
router.post(
  '/cdn/sync/:id',
  validateRequest({ params: fileIdSchema }),
  fileController.syncFileToCdn.bind(fileController)
);

// Bulk sync files to CDN (Admin only)
router.post(
  '/cdn/bulk-sync',
  fileController.bulkSyncToCdn.bind(fileController)
);

// Get CDN statistics (Admin only)
router.get(
  '/cdn/stats',
  fileController.getCdnStats.bind(fileController)
);

// Test CDN connection (Admin only)
router.get(
  '/cdn/test',
  fileController.testCdnConnection.bind(fileController)
);

// Progress tracking routes
router.get(
  '/progress/:uploadId',
  validateRequest({ params: z.object({ uploadId: z.string().uuid() }) }),
  fileController.getUploadProgress.bind(fileController)
);

// Bulk operations routes
router.post(
  '/bulk/delete',
  validateRequest({ 
    body: z.object({
      fileIds: z.array(z.string().uuid()).min(1).max(50)
    })
  }),
  fileController.bulkDeleteFiles.bind(fileController)
);

router.post(
  '/bulk/move',
  validateRequest({ 
    body: z.object({
      fileIds: z.array(z.string().uuid()).min(1).max(50),
      targetCategory: z.enum(['pdfs', 'images', 'videos', 'temp'])
    })
  }),
  fileController.bulkMoveFiles.bind(fileController)
);

// Enhanced metadata and search routes
router.get(
  '/detailed/:id',
  validateRequest({ params: fileIdSchema }),
  fileController.getDetailedFileMetadata.bind(fileController)
);

router.get(
  '/search',
  validateRequest({ 
    query: z.object({
      q: z.string().optional(),
      mimeType: z.string().optional(),
      category: z.enum(['pdfs', 'images', 'videos', 'temp']).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      minSize: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      maxSize: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      uploadedBy: z.string().uuid().optional(),
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    })
  }),
  fileController.searchFiles.bind(fileController)
);

export { router as fileRoutes };