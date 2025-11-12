import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes
import authRoutes from '../routes/auth.routes';
import { userRoutes } from '../routes/user.routes';
import courseRoutes from '../routes/course.routes';

// Import middleware
import { errorHandler } from '../middleware/error.middleware';

// Create test app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/courses', courseRoutes);

// Global error handler
app.use(errorHandler);
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt.utils';
import { Role } from '@prisma/client';

describe('Course Controller', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let adminUser: any;
  let teacherUser: any;
  let studentUser: any;
  let testCourse: any;

  beforeAll(async () => {
    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'hashedpassword',
        role: Role.ADMIN,
      },
    });

    teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@test.com',
        name: 'Teacher User',
        password: 'hashedpassword',
        role: Role.TEACHER,
      },
    });

    studentUser = await prisma.user.create({
      data: {
        email: 'student@test.com',
        name: 'Student User',
        password: 'hashedpassword',
        role: Role.STUDENT,
      },
    });

    // Create teacher profile
    await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
      },
    });

    // Create student profile
    await prisma.student.create({
      data: {
        userId: studentUser.id,
      },
    });

    // Generate tokens
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    teacherToken = generateAccessToken({
      userId: teacherUser.id,
      email: teacherUser.email,
      role: teacherUser.role,
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.enrollment.deleteMany({});
    await prisma.completion.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.section.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.teacher.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/courses', () => {
    it('should create a course as admin', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(courseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(courseData.title);
      expect(response.body.data.description).toBe(courseData.description);

      testCourse = response.body.data;
    });

    it('should not allow non-admin to create course', async () => {
      const courseData = {
        title: 'Unauthorized Course',
        description: 'Should not be created',
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(courseData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/courses', () => {


    it('should get all courses without authentication', async () => {
      const response = await request(app)
        .get('/api/courses');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeInstanceOf(Array);
    });

    it('should filter courses by search term', async () => {
      const response = await request(app)
        .get('/api/courses?search=Test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should get course by ID', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testCourse.id);
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/api/courses/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400); // Invalid UUID format
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('should update course as admin', async () => {
      const updateData = {
        title: 'Updated Test Course',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });
  });

  describe('POST /api/courses/sections', () => {
    it('should create section as admin', async () => {
      const sectionData = {
        title: 'Test Section',
        courseId: testCourse.id,
        order: 1,
      };

      const response = await request(app)
        .post('/api/courses/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sectionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(sectionData.title);
    });
  });

  describe('POST /api/courses/enroll', () => {
    let studentProfile: any;

    beforeAll(async () => {
      studentProfile = await prisma.student.findUnique({
        where: { userId: studentUser.id },
      });

      // Ensure testCourse exists
      if (!testCourse) {
        const courseData = {
          title: 'Test Course for Enrollment',
          description: 'A test course for enrollment testing',
        };

        const response = await request(app)
          .post('/api/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(courseData);

        testCourse = response.body.data;
      }
    });

    it('should enroll student in course', async () => {
      const enrollData = {
        courseId: testCourse.id,
        studentId: studentProfile.id,
      };

      const response = await request(app)
        .post('/api/courses/enroll')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(enrollData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.courseId).toBe(testCourse.id);
      expect(response.body.data.studentId).toBe(studentProfile.id);
    }, 10000);

    it('should not allow duplicate enrollment', async () => {
      const enrollData = {
        courseId: testCourse.id,
        studentId: studentProfile.id,
      };

      const response = await request(app)
        .post('/api/courses/enroll')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(enrollData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/courses/:courseId/enrollments', () => {
    it('should get course enrollments as admin', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse.id}/enrollments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should not allow student to view enrollments', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourse.id}/enrollments`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should not delete course with enrollments', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});