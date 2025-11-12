// File upload related types
export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FileAccessValidation {
  hasAccess: boolean;
  error?: string;
  file?: FileMetadata;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByType: {
    mimeType: string;
    count: number;
    size: number;
  }[];
}

export interface PaginatedFiles {
  files: FileMetadata[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
  baseUrl: string;
}

export interface FileCategory {
  name: string;
  path: string;
  allowedTypes: string[];
}

// File operation errors
export class FileNotFoundError extends Error {
  constructor(message: string = 'File not found') {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class FileAccessDeniedError extends Error {
  constructor(message: string = 'Access denied to file') {
    super(message);
    this.name = 'FileAccessDeniedError';
  }
}

export class FileUploadError extends Error {
  constructor(message: string = 'File upload failed') {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class FileValidationError extends Error {
  constructor(message: string = 'File validation failed') {
    super(message);
    this.name = 'FileValidationError';
  }
}

// Multer file type extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}