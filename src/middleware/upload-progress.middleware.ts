import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for upload progress (in production, use Redis)
interface UploadProgress {
  id: string;
  userId: string;
  totalSize: number;
  uploadedSize: number;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const uploadProgressStore: Map<string, UploadProgress> = new Map();

/**
 * Middleware to track upload progress
 */
export const trackUploadProgress = (req: Request, res: Response, next: NextFunction) => {
  const uploadId = uuidv4();
  const userId = (req as any).user?.id;
  const contentLength = parseInt(req.headers['content-length'] || '0');

  if (!userId) {
    return next();
  }

  // Initialize progress tracking
  const progressData: UploadProgress = {
    id: uploadId,
    userId,
    totalSize: contentLength,
    uploadedSize: 0,
    progress: 0,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  uploadProgressStore.set(uploadId, progressData);

  // Add upload ID to request for later use
  (req as any).uploadId = uploadId;

  // Track upload progress
  let uploadedBytes = 0;

  req.on('data', (chunk: Buffer) => {
    uploadedBytes += chunk.length;
    const progress = Math.round((uploadedBytes / contentLength) * 100);
    
    const updatedProgress: UploadProgress = {
      ...progressData,
      uploadedSize: uploadedBytes,
      progress,
      status: 'in_progress',
      updatedAt: new Date(),
    };

    uploadProgressStore.set(uploadId, updatedProgress);
  });

  req.on('end', () => {
    const finalProgress: UploadProgress = {
      ...progressData,
      uploadedSize: uploadedBytes,
      progress: 100,
      status: 'completed',
      updatedAt: new Date(),
    };

    uploadProgressStore.set(uploadId, finalProgress);

    // Clean up after 5 minutes
    setTimeout(() => {
      uploadProgressStore.delete(uploadId);
    }, 5 * 60 * 1000);
  });

  req.on('error', () => {
    const errorProgress: UploadProgress = {
      ...progressData,
      status: 'failed',
      updatedAt: new Date(),
    };

    uploadProgressStore.set(uploadId, errorProgress);

    // Clean up after 1 minute on error
    setTimeout(() => {
      uploadProgressStore.delete(uploadId);
    }, 60 * 1000);
  });

  next();
};

/**
 * Get upload progress by ID
 */
export const getUploadProgress = (uploadId: string, userId: string): UploadProgress | null => {
  const progress = uploadProgressStore.get(uploadId);
  
  if (!progress || progress.userId !== userId) {
    return null;
  }

  return progress;
};

/**
 * Clean up old upload progress entries
 */
export const cleanupUploadProgress = () => {
  const now = new Date();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [id, progress] of uploadProgressStore.entries()) {
    if (now.getTime() - progress.updatedAt.getTime() > maxAge) {
      uploadProgressStore.delete(id);
    }
  }
};

// Clean up every 5 minutes
setInterval(cleanupUploadProgress, 5 * 60 * 1000);