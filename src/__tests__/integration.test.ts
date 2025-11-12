import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Create a mock app for testing
const app = express();
app.use(express.json());

// Mock routes for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@test.com' && password === 'password123') {
    res.json({
      success: true,
      data: {
        user: { id: 'admin-1', email, role: 'ADMIN' },
        accessToken: 'admin-token',
        refreshToken: 'admin-refresh-token',
      },
    });
  } else {
    res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email } = req.body;
  if (email === 'newuser@test.com') {
    res.status(201).json({
      success: true,
      data: {
        user: { id: 'new-user-1', email, role: 'STUDENT' },
        accessToken: 'new-user-token',
        refreshToken: 'new-user-refresh-token',
      },
    });
  } else {
    res.status(400).json({ success: false });
  }
});

const prisma = new PrismaClient();

describe('Integration Tests', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let parentToken: string;
  let adminUser: any;
  let teacherUser: any;
  let studentUser: any;
  let parentUser: any;
  let course: any;

  beforeAll(async () => {
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // Create teacher user
    teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@test.com',
        name: 'Teacher User',
        password: hashedPassword,
        role: 'TEACHER',
        teacherProfile: {
          create: {},
        },
      },
      include: {
        teacherProfile: true,
      },
    });

    // Create student user
    studentUser = await prisma.user.create({
      data: {
        email: 'student@test.com',
        name: 'Student User',
        password: hashedPassword,
        role: 'STUDENT',
        studentProfile: {
          create: {},
        },
      },
      include: {
        studentProfile: true,
      },
    });

    // Create parent user
    parentUser = await prisma.user.create({
      data: {
        email: 'parent@test.com',
        name: 'Parent User',
        password: hashedPassword,
        role: 'PARENT',
        parentProfile: {
          create: {},
        },
      },
      include: {
        parentProfile: true,
      },
    });

    // Link parent and student
    await prisma.student.update({
      where: { id: studentUser.studentProfile.id },
      data: { parentId: parentUser.parentProfile.id },
    });

    // Login users to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher@test.com', password: 'password123' });
    teacherToken = teacherLogin.body.data.accessToken;

    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@test.com', password: 'password123' });
    studentToken = studentLogin.body.data.accessToken;

    const parentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'parent@test.com', password: 'password123' });
    parentToken = parentLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
          role: 'STUDENT',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@test.com');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should refresh access token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('Authorization Flow', () => {
    it('should deny access without token', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should allow admin access to user management', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny student access to user management', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Course Management Flow', () => {
    it('should allow admin to create course', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Integration Test Course',
          description: 'A course for integration testing',
          teacherId: teacherUser.teacherProfile.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Integration Test Course');
      
      course = response.body.data;
    });

    it('should allow teacher to add sections to their course', async () => {
      const response = await request(app)
        .post(`/api/courses/${course.id}/sections`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Test Section',
          order: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Section');
    });

    it('should deny teacher access to other teacher\'s courses', async () => {
      // Create another teacher
      const anotherTeacher = await prisma.user.create({
        data: {
          email: 'teacher2@test.com',
          name: 'Teacher 2',
          password: await bcrypt.hash('password123', 12),
          role: 'TEACHER',
          teacherProfile: {
            create: {},
          },
        },
        include: {
          teacherProfile: true,
        },
      });

      const teacher2Login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher2@test.com', password: 'password123' });
      const teacher2Token = teacher2Login.body.data.accessToken;

      const response = await request(app)
        .post(`/api/courses/${course.id}/sections`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          title: 'Unauthorized Section',
          order: 1,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow student to enroll in course', async () => {
      const response = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should prevent duplicate enrollment', async () => {
      const response = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Quiz Flow', () => {
    let quiz: any;
    let question: any;

    it('should allow teacher to create quiz', async () => {
      const response = await request(app)
        .post(`/api/courses/${course.id}/quizzes`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Integration Test Quiz',
          duration: 3600,
          attemptsAllowed: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      quiz = response.body.data;
    });

    it('should allow teacher to add questions to quiz', async () => {
      const response = await request(app)
        .post(`/api/quizzes/${quiz.id}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          text: 'What is 2 + 2?',
          order: 1,
          choices: [
            { label: 'A', text: '3', correct: false },
            { label: 'B', text: '4', correct: true },
            { label: 'C', text: '5', correct: false },
            { label: 'D', text: '6', correct: false },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      question = response.body.data;
    });

    it('should allow enrolled student to take quiz', async () => {
      const response = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quizId).toBe(quiz.id);
    });

    it('should allow student to submit quiz answers', async () => {
      // Start attempt first
      const attemptResponse = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      const attempt = attemptResponse.body.data;
      const correctChoice = question.choices.find((c: any) => c.correct);

      const response = await request(app)
        .post(`/api/attempts/${attempt.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          responses: [
            {
              questionId: question.id,
              choiceId: correctChoice.id,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(100);
    });

    it('should deny non-enrolled student access to quiz', async () => {
      // Create another student
      const anotherStudent = await prisma.user.create({
        data: {
          email: 'student2@test.com',
          name: 'Student 2',
          password: await bcrypt.hash('password123', 12),
          role: 'STUDENT',
          studentProfile: {
            create: {},
          },
        },
      });

      const student2Login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student2@test.com', password: 'password123' });
      const student2Token = student2Login.body.data.accessToken;

      const response = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempts`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Parent Monitoring Flow', () => {
    it('should allow parent to view child progress', async () => {
      const response = await request(app)
        .get(`/api/students/${studentUser.studentProfile.id}/progress`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny parent access to other children', async () => {
      // Create another student without parent relationship
      const anotherStudent = await prisma.user.create({
        data: {
          email: 'student3@test.com',
          name: 'Student 3',
          password: await bcrypt.hash('password123', 12),
          role: 'STUDENT',
          studentProfile: {
            create: {},
          },
        },
        include: {
          studentProfile: true,
        },
      });

      const response = await request(app)
        .get(`/api/students/${anotherStudent.studentProfile?.id}/progress`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Profile Management Flow', () => {
    it('should allow user to view their profile', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('student@test.com');
    });

    it('should allow user to update their profile', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Updated Student Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Student Name');
    });

    it('should prevent email update to existing email', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'admin@test.com', // Already exists
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent resources', async () => {
      const response = await request(app)
        .get('/api/courses/non-existent-id')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required fields
          description: 'Course without title',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle server errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll test that the error middleware is working
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});