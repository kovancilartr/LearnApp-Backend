import fs from 'fs';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock Prisma
const mockPrisma = {
  file: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  parent: {
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Import after mocking
import { fileService } from '../services/file.service';

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveFileMetadata', () => {
    it('should save file metadata to database', async () => {
      const mockFileData = {
        filename: 'test-file.pdf',
        originalName: 'original-test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/pdfs/test-file.pdf',
        uploadedBy: 'user-123',
      };

      const mockSavedFile = {
        id: 'file-123',
        ...mockFileData,
        url: 'http://localhost:3002/api/files/pdfs/test-file.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.file.create.mockResolvedValue(mockSavedFile);

      const result = await fileService.saveFileMetadata(mockFileData);

      expect(result).toEqual(mockSavedFile);
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', async () => {
      const mockFile = {
        id: 'file-123',
        filename: 'test-file.pdf',
        originalName: 'original-test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/pdfs/test-file.pdf',
        url: 'http://localhost:3002/api/files/pdfs/test-file.pdf',
        uploadedBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockPrisma.file.findUnique.mockResolvedValue(mockFile);

      const result = await fileService.getFileById('file-123');

      expect(result).toEqual(mockFile);
    });

    it('should return null if file not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      const result = await fileService.getFileById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should delete file when user is owner', async () => {
      const mockFile = {
        id: 'file-123',
        filename: 'test-file.pdf',
        path: '/uploads/pdfs/test-file.pdf',
        uploadedBy: 'user-123',
      };

      const mockUser = {
        id: 'user-123',
        role: 'STUDENT',
      };

      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});
      mockPrisma.file.delete.mockResolvedValue(mockFile);

      const result = await fileService.deleteFile('file-123', 'user-123');

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/uploads/pdfs/test-file.pdf');
      expect(result).toEqual({ message: 'File deleted successfully' });
    });

    it('should throw error when file not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      await expect(fileService.deleteFile('non-existent', 'user-123'))
        .rejects.toThrow('File not found');
    });
  });

  describe('validateFileAccess', () => {
    it('should allow access to file owner', async () => {
      const mockFile = {
        id: 'file-123',
        uploadedBy: 'user-123',
        uploader: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const mockUser = {
        id: 'user-123',
        role: 'STUDENT',
      };

      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await fileService.validateFileAccess('file-123', 'user-123');

      expect(result.hasAccess).toBe(true);
      expect(result.file).toEqual(mockFile);
    });

    it('should allow access to admin', async () => {
      const mockFile = {
        id: 'file-123',
        uploadedBy: 'other-user',
        uploader: {
          id: 'other-user',
          name: 'Other User',
          email: 'other@example.com',
        },
      };

      const mockUser = {
        id: 'admin-123',
        role: 'ADMIN',
      };

      mockPrisma.file.findUnique.mockResolvedValue(mockFile);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await fileService.validateFileAccess('file-123', 'admin-123');

      expect(result.hasAccess).toBe(true);
      expect(result.file).toEqual(mockFile);
    });
  });

  describe('cleanupOrphanedFiles', () => {
    it('should remove orphaned files from database', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          filename: 'existing.pdf',
          path: '/uploads/pdfs/existing.pdf',
        },
        {
          id: 'file-2',
          filename: 'missing.pdf',
          path: '/uploads/pdfs/missing.pdf',
        },
      ];

      mockPrisma.file.findMany.mockResolvedValue(mockFiles);
      mockFs.existsSync.mockImplementation((path) => path === '/uploads/pdfs/existing.pdf');
      mockPrisma.file.delete.mockResolvedValue(mockFiles[1]);

      const result = await fileService.cleanupOrphanedFiles();

      expect(result.message).toContain('1 orphaned files');
      expect(mockPrisma.file.delete).toHaveBeenCalledWith({ where: { id: 'file-2' } });
    });
  });

  describe('getStorageUsage', () => {
    it('should return storage usage summary', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          path: '/uploads/images/image1.jpg',
          size: 1024,
        },
        {
          id: 'file-2',
          path: '/uploads/pdfs/doc1.pdf',
          size: 2048,
        },
      ];

      mockPrisma.file.findMany
        .mockResolvedValueOnce([mockFiles[0]]) // images
        .mockResolvedValueOnce([mockFiles[1]]) // videos
        .mockResolvedValueOnce([]) // pdfs
        .mockResolvedValueOnce([]); // temp

      // Mock getFileStats
      jest.spyOn(fileService, 'getFileStats').mockResolvedValue({
        totalFiles: 2,
        totalSize: 3072,
        filesByType: [],
      });

      const result = await fileService.getStorageUsage();

      expect(result.total.files).toBe(2);
      expect(result.total.size).toBe(3072);
      expect(result.categories).toHaveProperty('images');
      expect(result.categories).toHaveProperty('videos');
      expect(result.categories).toHaveProperty('pdfs');
      expect(result.categories).toHaveProperty('temp');
    });
  });
});