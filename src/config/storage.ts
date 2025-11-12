import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Local storage configuration
export const localStorageConfig = {
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
  ],
};

// BunnyNet CDN Configuration
export const bunnyNetConfig = {
  enabled: process.env.BUNNYNET_ENABLED === 'true',
  storageZone: process.env.BUNNYNET_STORAGE_ZONE || '',
  storagePassword: process.env.BUNNYNET_STORAGE_PASSWORD || '',
  pullZoneUrl: process.env.BUNNYNET_PULL_ZONE_URL || '',
  storageApiUrl: process.env.BUNNYNET_STORAGE_API_URL || 'https://storage.bunnycdn.com',
  region: process.env.BUNNYNET_REGION || 'de', // Default to Germany region
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// AWS S3 Configuration (optional)
export const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'learnapp-files',
};

// Initialize S3 client (optional)
export const s3Client = new AWS.S3({
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  region: s3Config.region,
});

// File upload configuration
export const uploadConfig = {
  maxFileSize: localStorageConfig.maxFileSize,
  allowedMimeTypes: localStorageConfig.allowedMimeTypes,
  presignedUrlExpiry: 60 * 5, // 5 minutes
  // Rate limiting for file uploads
  uploadRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxUploads: 20, // 20 uploads per 15 minutes per user
  },
  // File validation rules
  validation: {
    maxFilenameLength: 255,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'],
    prohibitedFilenames: ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'],
  },
};

// Create upload directories if they don't exist
export const createUploadDirectories = () => {
  const baseDir = localStorageConfig.uploadDir;
  const directories = [
    baseDir,
    path.join(baseDir, 'pdfs'),
    path.join(baseDir, 'images'),
    path.join(baseDir, 'videos'),
    path.join(baseDir, 'temp'),
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Get file category based on mime type
export const getFileCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType === 'application/pdf') return 'pdfs';
  return 'temp';
};