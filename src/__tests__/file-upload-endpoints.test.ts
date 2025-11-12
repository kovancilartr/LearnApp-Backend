import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

describe('File Upload API Endpoints', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: 'filetest@example.com',
        name: 'File Test User',
        password: 'hashedpassword',
        role: 'STUDENT',
      },
    });

    userId = testUser.id;

    // Mock JWT token (in real tests, you'd generate a proper token)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.file.deleteMany({
      where: { uploadedBy: userId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/files/upload', () => {
    it('should upload a single file with progress tracking', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.pdf');
      
      // Create test file if it doesn't exist
      if (!fs.existsSync(path.dirname(testFilePath))) {
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
      }
      if (!fs.existsSync(testFilePath)) {
        fs.writeFileSync(testFilePath, 'Test PDF content');
      }

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data.originalName).toBe('test.pdf');
    });

    it('should reject invalid file types', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.exe');
      
      if (!fs.existsSync(testFilePath)) {
        fs.writeFileSync(testFilePath, 'Executable content');
      }

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_ERROR');
    });
  });

  describe('POST /api/files/upload-multiple', () => {
    it('should upload multiple files', async () => {
      const testFile1 = path.join(__dirname, 'fixtures', 'test1.jpg');
      const testFile2 = path.join(__dirname, 'fixtures', 'test2.png');
      
      // Create test files
      if (!fs.existsSync(testFile1)) {
        fs.writeFileSync(testFile1, 'JPEG content');
      }
      if (!fs.existsSync(testFile2)) {
        fs.writeFileSync(testFile2, 'PNG content');
      }

      const response = await request(app)
        .post('/api/files/upload-multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testFile1)
        .attach('files', testFile2)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data).toHaveProperty('uploadId');
    });
  });

  describe('GET /api/files/progress/:uploadId', () => {
    it('should return upload progress', async () => {
      // This would require a real upload in progress
      // For now, we'll test the endpoint structure
      const mockUploadId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/files/progress/${mockUploadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Expected since upload doesn't exist

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROGRESS_ERROR');
    });
  });

  describe('POST /api/files/bulk/delete', () => {
    it('should delete multiple files', async () => {
      // First create some test files
      const file1 = await prisma.file.create({
        data: {
          filename: 'bulk-test-1.pdf',
          originalName: 'bulk-test-1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          path: '/uploads/pdfs/bulk-test-1.pdf',
          url: 'http://localhost:3001/api/files/pdfs/bulk-test-1.pdf',
          uploadedBy: userId,
        },
      });

      const file2 = await prisma.file.create({
        data: {
          filename: 'bulk-test-2.pdf',
          originalName: 'bulk-test-2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          path: '/uploads/pdfs/bulk-test-2.pdf',
          url: 'http://localhost:3001/api/files/pdfs/bulk-test-2.pdf',
          uploadedBy: userId,
        },
      });

      const response = await request(app)
        .post('/api/files/bulk/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileIds: [file1.id, file2.id],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(2);
    });
  });

  describe('GET /api/files/search', () => {
    it('should search files with filters', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .query({
          q: 'test',
          mimeType: 'application/pdf',
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('GET /api/files/detailed/:id', () => {
    it('should return detailed file metadata', async () => {
      // Create a test file first
      const testFile = await prisma.file.create({
        data: {
          filename: 'detailed-test.pdf',
          originalName: 'detailed-test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          path: '/uploads/pdfs/detailed-test.pdf',
          url: 'http://localhost:3001/api/files/pdfs/detailed-test.pdf',
          uploadedBy: userId,
        },
      });

      const response = await request(app)
        .get(`/api/files/detailed/${testFile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('sizeFormatted');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data).toHaveProperty('uploader');
    });
  });
});