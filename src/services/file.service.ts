import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { localStorageConfig, getFileCategory } from '../config/storage';
import { bunnyNetService, BunnyNetUploadResult } from './bunnynet.service';

const prisma = new PrismaClient();

export interface FileUploadData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: string;
}

export interface FileWithCdn {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  cdnUrl?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileService {
  // Save file metadata to database with CDN support
  async saveFileMetadata(fileData: FileUploadData): Promise<FileWithCdn> {
    const category = getFileCategory(fileData.mimeType);
    const localUrl = `${localStorageConfig.baseUrl}/api/files/${category}/${fileData.filename}`;
    
    // Try to upload to BunnyNet CDN if enabled
    let cdnUrl: string | undefined;
    let bunnyNetResult: BunnyNetUploadResult | null = null;

    if (bunnyNetService.isConfigured()) {
      try {
        bunnyNetResult = await bunnyNetService.uploadFile(
          fileData.path,
          fileData.filename,
          category
        );

        if (bunnyNetResult.success && bunnyNetResult.cdnUrl) {
          cdnUrl = bunnyNetResult.cdnUrl;
          console.log(`File uploaded to BunnyNet CDN: ${cdnUrl}`);
        } else {
          console.warn(`BunnyNet upload failed: ${bunnyNetResult.error}`);
        }
      } catch (error) {
        console.error('BunnyNet upload error:', error);
      }
    }

    const file = await prisma.file.create({
      data: {
        filename: fileData.filename,
        originalName: fileData.originalName,
        mimeType: fileData.mimeType,
        size: fileData.size,
        path: fileData.path,
        url: localUrl,
        cdnUrl,
        uploadedBy: fileData.uploadedBy,
      },
    });

    return file as FileWithCdn;
  }

  // Get file by ID
  async getFileById(id: string) {
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return file;
  }

  // Get file by filename
  async getFileByFilename(filename: string) {
    const file = await prisma.file.findFirst({
      where: { filename },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return file;
  }

  // Get files by user
  async getFilesByUser(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: { uploadedBy: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.count({
        where: { uploadedBy: userId },
      }),
    ]);

    return {
      files,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Delete file with CDN cleanup
  async deleteFile(id: string, userId: string) {
    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Check if user owns the file or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (file.uploadedBy !== userId && user?.role !== 'ADMIN') {
      throw new Error('Unauthorized to delete this file');
    }

    // Delete from BunnyNet CDN if it exists there
    if (file.cdnUrl && bunnyNetService.isConfigured()) {
      try {
        const category = getFileCategory(file.mimeType);
        const deleteResult = await bunnyNetService.deleteFile(file.filename, category);
        if (deleteResult.success) {
          console.log(`File deleted from BunnyNet CDN: ${file.filename}`);
        } else {
          console.warn(`Failed to delete from BunnyNet CDN: ${deleteResult.error}`);
        }
      } catch (error) {
        console.error('Error deleting from BunnyNet CDN:', error);
      }
    }

    // Delete physical file from local storage
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Error deleting physical file:', error);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id },
    });

    return { message: 'File deleted successfully' };
  }

  // Get file stats
  async getFileStats(userId?: string) {
    const whereClause = userId ? { uploadedBy: userId } : {};

    const [totalFiles, totalSize, filesByType] = await Promise.all([
      prisma.file.count({ where: whereClause }),
      prisma.file.aggregate({
        where: whereClause,
        _sum: { size: true },
      }),
      prisma.file.groupBy({
        by: ['mimeType'],
        where: whereClause,
        _count: { id: true },
        _sum: { size: true },
      }),
    ]);

    return {
      totalFiles,
      totalSize: totalSize._sum.size || 0,
      filesByType: filesByType.map(item => ({
        mimeType: item.mimeType,
        count: item._count.id,
        size: item._sum.size || 0,
      })),
    };
  }

  // Clean up orphaned files (files in database but not on disk)
  async cleanupOrphanedFiles() {
    const files = await prisma.file.findMany();
    const orphanedFiles = [];

    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        orphanedFiles.push(file);
        // Remove from database
        await prisma.file.delete({ where: { id: file.id } });
      }
    }

    return {
      message: `Cleaned up ${orphanedFiles.length} orphaned files`,
      orphanedFiles: orphanedFiles.map(f => ({ id: f.id, filename: f.filename })),
    };
  }

  // Clean up old temporary files (older than 24 hours)
  async cleanupTempFiles() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const tempFiles = await prisma.file.findMany({
      where: {
        path: {
          contains: '/temp/',
        },
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    const deletedFiles = [];

    for (const file of tempFiles) {
      try {
        // Delete physical file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        // Delete from database
        await prisma.file.delete({ where: { id: file.id } });
        deletedFiles.push(file);
      } catch (error) {
        console.error(`Error deleting temp file ${file.id}:`, error);
      }
    }

    return {
      message: `Cleaned up ${deletedFiles.length} temporary files`,
      deletedFiles: deletedFiles.map(f => ({ id: f.id, filename: f.filename })),
    };
  }

  // Get storage usage summary
  async getStorageUsage() {
    const stats = await this.getFileStats();
    const categories = ['images', 'videos', 'pdfs', 'temp'];
    const categoryStats: Record<string, { count: number; size: number; sizeFormatted: string }> = {};

    for (const category of categories) {
      const categoryFiles = await prisma.file.findMany({
        where: {
          path: {
            contains: `/${category}/`,
          },
        },
      });

      const totalSize = categoryFiles.reduce((sum, file) => sum + file.size, 0);
      categoryStats[category] = {
        count: categoryFiles.length,
        size: totalSize,
        sizeFormatted: this.formatFileSize(totalSize),
      };
    }

    return {
      total: {
        files: stats.totalFiles,
        size: stats.totalSize,
        sizeFormatted: this.formatFileSize(stats.totalSize),
      },
      categories: categoryStats,
    };
  }

  // Format file size in human readable format
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file URL with CDN fallback
  getFileUrl(file: FileWithCdn): string {
    // Prefer CDN URL if available and BunnyNet is configured
    if (file.cdnUrl && bunnyNetService.isConfigured()) {
      return file.cdnUrl;
    }
    
    // Fallback to local URL
    return file.url;
  }

  // Sync file to CDN (manual sync for existing files)
  async syncFileToCdn(fileId: string): Promise<{ success: boolean; cdnUrl?: string; error?: string }> {
    if (!bunnyNetService.isConfigured()) {
      return {
        success: false,
        error: 'BunnyNet CDN is not configured',
      };
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    // Skip if already has CDN URL
    if (file.cdnUrl) {
      return {
        success: true,
        cdnUrl: file.cdnUrl,
      };
    }

    try {
      const category = getFileCategory(file.mimeType);
      const syncResult = await bunnyNetService.syncFile(file.path, file.filename, category);

      if (syncResult.success && syncResult.cdnUrl) {
        // Update database with CDN URL
        await prisma.file.update({
          where: { id: fileId },
          data: { cdnUrl: syncResult.cdnUrl },
        });

        return {
          success: true,
          cdnUrl: syncResult.cdnUrl,
        };
      }

      return {
        success: false,
        error: syncResult.error || 'Sync failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Sync error',
      };
    }
  }

  // Bulk sync files to CDN
  async bulkSyncToCdn(limit: number = 50): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    if (!bunnyNetService.isConfigured()) {
      throw new Error('BunnyNet CDN is not configured');
    }

    const filesWithoutCdn = await prisma.file.findMany({
      where: {
        cdnUrl: null,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const file of filesWithoutCdn) {
      try {
        const syncResult = await this.syncFileToCdn(file.id);
        if (syncResult.success) {
          synced++;
        } else {
          failed++;
          errors.push(`${file.filename}: ${syncResult.error}`);
        }
      } catch (error: any) {
        failed++;
        errors.push(`${file.filename}: ${error.message}`);
      }

      // Small delay to avoid overwhelming the CDN
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { synced, failed, errors };
  }

  // Get CDN statistics
  async getCdnStats(): Promise<{
    totalFiles: number;
    filesWithCdn: number;
    filesWithoutCdn: number;
    cdnEnabled: boolean;
  }> {
    const [totalFiles, filesWithCdn] = await Promise.all([
      prisma.file.count(),
      prisma.file.count({
        where: {
          cdnUrl: { not: null },
        },
      }),
    ]);

    return {
      totalFiles,
      filesWithCdn,
      filesWithoutCdn: totalFiles - filesWithCdn,
      cdnEnabled: bunnyNetService.isConfigured(),
    };
  }

  // Test CDN connection
  async testCdnConnection(): Promise<{ success: boolean; error?: string }> {
    if (!bunnyNetService.isConfigured()) {
      return {
        success: false,
        error: 'BunnyNet CDN is not configured',
      };
    }

    return await bunnyNetService.testConnection();
  }

  // Validate file access
  async validateFileAccess(fileId: string, userId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: true,
      },
    });

    if (!file) {
      return { hasAccess: false, error: 'File not found' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { hasAccess: false, error: 'User not found' };
    }

    // File owner has access
    if (file.uploadedBy === userId) {
      return { hasAccess: true, file };
    }

    // Admin has access to all files
    if (user.role === 'ADMIN') {
      return { hasAccess: true, file };
    }

    // Teachers can access files uploaded by their students (for assignments)
    if (user.role === 'TEACHER') {
      const uploaderStudent = await prisma.student.findUnique({
        where: { userId: file.uploadedBy },
        include: {
          enrollments: {
            include: {
              course: {
                include: {
                  teacher: true,
                },
              },
            },
          },
        },
      });

      if (uploaderStudent) {
        const hasTeacherAccess = uploaderStudent.enrollments.some(
          enrollment => enrollment.course.teacher?.userId === userId
        );
        if (hasTeacherAccess) {
          return { hasAccess: true, file };
        }
      }
    }

    // Parents can access files uploaded by their children
    if (user.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: {
          children: true,
        },
      });

      if (parent) {
        const hasParentAccess = parent.children.some(
          child => child.userId === file.uploadedBy
        );
        if (hasParentAccess) {
          return { hasAccess: true, file };
        }
      }
    }

    return { hasAccess: false, error: 'Access denied' };
  }

  // Get upload progress (for chunked uploads)
  async getUploadProgress(uploadId: string, userId: string) {
    // Import the progress tracking function
    const { getUploadProgress } = await import('../middleware/upload-progress.middleware');
    
    const uploadProgress = getUploadProgress(uploadId, userId);

    if (!uploadProgress) {
      throw new Error('Upload progress not found');
    }

    return {
      uploadId,
      progress: uploadProgress.progress,
      status: uploadProgress.status,
      totalSize: uploadProgress.totalSize,
      uploadedSize: uploadProgress.uploadedSize,
      startedAt: uploadProgress.createdAt,
      estimatedTimeRemaining: this.calculateEstimatedTime(uploadProgress),
    };
  }

  // Calculate estimated time remaining for upload
  private calculateEstimatedTime(uploadProgress: any): number {
    if (!uploadProgress.uploadedSize || uploadProgress.uploadedSize === 0) {
      return 0;
    }

    const elapsedTime = Date.now() - uploadProgress.createdAt.getTime();
    const uploadSpeed = uploadProgress.uploadedSize / (elapsedTime / 1000); // bytes per second
    const remainingBytes = uploadProgress.totalSize - uploadProgress.uploadedSize;
    
    return Math.ceil(remainingBytes / uploadSpeed);
  }

  // Bulk delete files
  async bulkDeleteFiles(fileIds: string[], userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
      summary: {
        total: fileIds.length,
        successful: 0,
        failed: 0,
      },
    };

    for (const fileId of fileIds) {
      try {
        // Check access for each file
        const accessResult = await this.validateFileAccess(fileId, userId);
        if (!accessResult.hasAccess && user.role !== 'ADMIN') {
          results.failed.push({ id: fileId, error: 'Access denied' });
          continue;
        }

        await this.deleteFile(fileId, userId);
        results.deleted.push(fileId);
        results.summary.successful++;
      } catch (error) {
        results.failed.push({ 
          id: fileId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        results.summary.failed++;
      }
    }

    return results;
  }

  // Bulk move files to different category
  async bulkMoveFiles(fileIds: string[], targetCategory: string, userId: string, userRole?: string) {
    const results = {
      moved: [] as string[],
      failed: [] as { id: string; error: string }[],
      summary: {
        total: fileIds.length,
        successful: 0,
        failed: 0,
      },
    };

    for (const fileId of fileIds) {
      try {
        // Check access for each file
        const accessResult = await this.validateFileAccess(fileId, userId);
        if (!accessResult.hasAccess && userRole !== 'ADMIN') {
          results.failed.push({ id: fileId, error: 'Access denied' });
          continue;
        }

        const file = accessResult.file;
        if (!file) {
          results.failed.push({ id: fileId, error: 'File not found' });
          continue;
        }

        // Create new path in target category
        const newPath = path.join(
          localStorageConfig.uploadDir,
          targetCategory,
          path.basename(file.path)
        );

        // Move physical file
        if (fs.existsSync(file.path)) {
          fs.renameSync(file.path, newPath);
        }

        // Update database
        await prisma.file.update({
          where: { id: fileId },
          data: {
            path: newPath,
            url: `${localStorageConfig.baseUrl}/api/files/${targetCategory}/${path.basename(file.path)}`,
          },
        });

        results.moved.push(fileId);
        results.summary.successful++;
      } catch (error) {
        results.failed.push({ 
          id: fileId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        results.summary.failed++;
      }
    }

    return results;
  }

  // Get detailed file metadata with access history
  async getDetailedFileMetadata(fileId: string, userId: string) {
    const accessResult = await this.validateFileAccess(fileId, userId);
    if (!accessResult.hasAccess) {
      throw new Error(accessResult.error || 'Access denied');
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Get file stats
    const fileStats = fs.existsSync(file.path) ? fs.statSync(file.path) : null;

    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      sizeFormatted: this.formatFileSize(file.size),
      path: file.path,
      url: file.url,
      cdnUrl: file.cdnUrl,
      category: getFileCategory(file.mimeType),
      uploader: file.uploader,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      fileExists: fileStats !== null,
      lastModified: fileStats?.mtime,
      lastAccessed: fileStats?.atime,
      permissions: fileStats?.mode,
      isPublic: false, // Could be extended to support public files
      downloadCount: 0, // Could be tracked in a separate table
      tags: [], // Could be extended to support file tagging
    };
  }

  // Search files with advanced filters
  async searchFiles(searchParams: {
    query?: string;
    mimeType?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    minSize?: number;
    maxSize?: number;
    uploadedBy?: string;
    page: number;
    limit: number;
  }, userId: string, userRole?: string) {
    const {
      query,
      mimeType,
      category,
      dateFrom,
      dateTo,
      minSize,
      maxSize,
      uploadedBy,
      page,
      limit,
    } = searchParams;

    const skip = (page - 1) * limit;
    const whereClause: any = {};

    // Build where clause based on user role
    if (userRole !== 'ADMIN') {
      // Non-admin users can only see their own files or files they have access to
      whereClause.uploadedBy = userId;
    }

    // Apply search filters
    if (query) {
      whereClause.OR = [
        { originalName: { contains: query, mode: 'insensitive' } },
        { filename: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (mimeType) {
      whereClause.mimeType = mimeType;
    }

    if (category) {
      whereClause.path = { contains: `/${category}/` };
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    if (minSize !== undefined || maxSize !== undefined) {
      whereClause.size = {};
      if (minSize !== undefined) {
        whereClause.size.gte = minSize;
      }
      if (maxSize !== undefined) {
        whereClause.size.lte = maxSize;
      }
    }

    if (uploadedBy && userRole === 'ADMIN') {
      whereClause.uploadedBy = uploadedBy;
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.count({ where: whereClause }),
    ]);

    return {
      files: files.map(file => ({
        ...file,
        sizeFormatted: this.formatFileSize(file.size),
        category: getFileCategory(file.mimeType),
        url: this.getFileUrl(file as FileWithCdn),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: searchParams,
    };
  }
}

export const fileService = new FileService();