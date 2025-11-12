import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { fileService } from '../services/file.service';
import { createUploadDirectories } from '../config/storage';
import fs from 'fs';

// Initialize upload directories
createUploadDirectories();

export class FileController {
  // Upload single file
  async uploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: userId,
      };

      const savedFile = await fileService.saveFileMetadata(fileData);

      res.status(201).json({
        success: true,
        data: {
          id: savedFile.id,
          filename: savedFile.filename,
          originalName: savedFile.originalName,
          mimeType: savedFile.mimeType,
          size: savedFile.size,
          url: fileService.getFileUrl(savedFile),
          localUrl: savedFile.url,
          cdnUrl: savedFile.cdnUrl,
          createdAt: savedFile.createdAt,
          uploadId: (req as any).uploadId, // Include upload ID for progress tracking
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload file',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files uploaded',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const uploadPromises = req.files.map(file => {
        const fileData = {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: userId,
        };
        return fileService.saveFileMetadata(fileData);
      });

      const savedFiles = await Promise.all(uploadPromises);

      res.status(201).json({
        success: true,
        data: {
          files: savedFiles.map(file => ({
            id: file.id,
            filename: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            url: fileService.getFileUrl(file),
            localUrl: file.url,
            cdnUrl: file.cdnUrl,
            createdAt: file.createdAt,
          })),
          uploadId: (req as any).uploadId, // Include upload ID for progress tracking
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Multiple files upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Serve file
  async serveFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { filename } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Find file by filename
      const file = await fileService.getFileByFilename(filename);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate access
      const accessResult = await fileService.validateFileAccess(file.id, userId);
      if (!accessResult.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: accessResult.error || 'Access denied',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if physical file exists
      if (!fs.existsSync(file.path)) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PHYSICAL_FILE_NOT_FOUND',
            message: 'Physical file not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Set security headers
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': file.size.toString(),
        'Content-Disposition': `inline; filename="${file.originalName}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      // Stream file
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      console.error('File serve error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVE_ERROR',
          message: 'Failed to serve file',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get file metadata
  async getFileMetadata(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const file = await fileService.getFileById(id);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate access
      const accessResult = await fileService.validateFileAccess(id, userId);
      if (!accessResult.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: accessResult.error || 'Access denied',
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: fileService.getFileUrl(file as any),
          localUrl: file.url,
          cdnUrl: (file as any).cdnUrl,
          uploader: file.uploader,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get file metadata error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METADATA_ERROR',
          message: 'Failed to get file metadata',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user files
  async getUserFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await fileService.getFilesByUser(userId, page, limit);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FILES_ERROR',
          message: 'Failed to get user files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete file
  async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.deleteFile(id, userId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete file error:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                         error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete file',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get file statistics
  async getFileStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Only admin can see global stats, others see their own stats
      const statsUserId = userRole === 'ADMIN' ? undefined : userId;
      const stats = await fileService.getFileStats(statsUserId);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get file stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get file statistics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get storage usage (Admin only)
  async getStorageUsage(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const usage = await fileService.getStorageUsage();

      res.json({
        success: true,
        data: usage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get storage usage error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STORAGE_USAGE_ERROR',
          message: 'Failed to get storage usage',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Cleanup orphaned files (Admin only)
  async cleanupOrphanedFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.cleanupOrphanedFiles();

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cleanup orphaned files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup orphaned files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Cleanup temporary files (Admin only)
  async cleanupTempFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.cleanupTempFiles();

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cleanup temp files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup temporary files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Sync file to CDN
  async syncFileToCdn(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check file access
      const accessResult = await fileService.validateFileAccess(id, userId);
      if (!accessResult.hasAccess && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.syncFileToCdn(id);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Sync file to CDN error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CDN_SYNC_ERROR',
          message: 'Failed to sync file to CDN',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Bulk sync files to CDN (Admin only)
  async bulkSyncToCdn(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const result = await fileService.bulkSyncToCdn(limit);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk sync to CDN error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_CDN_SYNC_ERROR',
          message: 'Failed to bulk sync files to CDN',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get CDN statistics (Admin only)
  async getCdnStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const stats = await fileService.getCdnStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get CDN stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CDN_STATS_ERROR',
          message: 'Failed to get CDN statistics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Test CDN connection (Admin only)
  async testCdnConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.testCdnConnection();

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Test CDN connection error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CDN_TEST_ERROR',
          message: 'Failed to test CDN connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get upload progress (for chunked uploads)
  async getUploadProgress(req: AuthenticatedRequest, res: Response) {
    try {
      const { uploadId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const progress = await fileService.getUploadProgress(uploadId, userId);

      res.json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get upload progress error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESS_ERROR',
          message: 'Failed to get upload progress',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Bulk delete files
  async bulkDeleteFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'fileIds must be a non-empty array',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.bulkDeleteFiles(fileIds, userId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk delete files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_DELETE_ERROR',
          message: 'Failed to bulk delete files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Bulk move files to different category
  async bulkMoveFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileIds, targetCategory } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'fileIds must be a non-empty array',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!['pdfs', 'images', 'videos', 'temp'].includes(targetCategory)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Invalid target category',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await fileService.bulkMoveFiles(fileIds, targetCategory, userId, userRole);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk move files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_MOVE_ERROR',
          message: 'Failed to bulk move files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get detailed file metadata with access history
  async getDetailedFileMetadata(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const fileDetails = await fileService.getDetailedFileMetadata(id, userId);

      res.json({
        success: true,
        data: fileDetails,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get detailed file metadata error:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                         error instanceof Error && error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DETAILED_METADATA_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get detailed file metadata',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Search files with advanced filters
  async searchFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const searchParams = {
        query: req.query.q as string,
        mimeType: req.query.mimeType as string,
        category: req.query.category as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        minSize: req.query.minSize ? parseInt(req.query.minSize as string) : undefined,
        maxSize: req.query.maxSize ? parseInt(req.query.maxSize as string) : undefined,
        uploadedBy: req.query.uploadedBy as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await fileService.searchFiles(searchParams, userId, userRole);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Search files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search files',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const fileController = new FileController();