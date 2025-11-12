import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { localStorageConfig, getFileCategory, uploadConfig } from '../config/storage';
import { v4 as uuidv4 } from 'uuid';

// Enhanced file filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check if file type is allowed
    if (!localStorageConfig.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${localStorageConfig.allowedMimeTypes.join(', ')}`));
    }

    // Check filename length
    if (file.originalname.length > uploadConfig.validation.maxFilenameLength) {
      return cb(new Error(`Filename too long. Maximum length is ${uploadConfig.validation.maxFilenameLength} characters`));
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!uploadConfig.validation.allowedExtensions.includes(fileExtension)) {
      return cb(new Error(`File extension ${fileExtension} is not allowed. Allowed extensions: ${uploadConfig.validation.allowedExtensions.join(', ')}`));
    }

    // Check for prohibited filenames (Windows reserved names)
    const baseName = path.basename(file.originalname, fileExtension).toLowerCase();
    if (uploadConfig.validation.prohibitedFilenames.includes(baseName)) {
      return cb(new Error(`Filename "${baseName}" is not allowed`));
    }

    // Check for potentially dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(file.originalname)) {
      return cb(new Error('Filename contains invalid characters'));
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed'));
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const category = getFileCategory(file.mimetype);
    const uploadPath = path.join(localStorageConfig.uploadDir, category);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// Multer configuration
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: localStorageConfig.maxFileSize,
    files: 5, // Maximum 5 files per request
  },
});

// Single file upload
export const uploadSingle = (fieldName: string) => uploadMiddleware.single(fieldName);

// Multiple files upload
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => 
  uploadMiddleware.array(fieldName, maxCount);

// Fields upload (different field names)
export const uploadFields = (fields: { name: string; maxCount?: number }[]) =>
  uploadMiddleware.fields(fields);