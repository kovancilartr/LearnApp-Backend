import request from 'supertest';
import express from 'express';
import { Role } from '@prisma/client';
import { ProgressController } from '../controllers/progress.controller';
import { ProgressService } from '../services/progress.service';
import { authMiddleware } from '../middleware/auth.middleware';

// Mock dependencies
jest.mock('../services/progress.service');
jest.mock('../middleware/auth.middleware');
jest.mock('../config/database', () => ({
  prisma: {
    student: {
      findUnique: jest.fn(),
    },
    parent: {
      findUnique: jest.fn(),
    },
    teacher: {
      findUnique: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());

// Mock auth middleware to add user to request
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = {
    id: 'user-1',
    role: Role.STUDENT,
  };
  next();
};

app.use(mockAuthMiddleware);

// Setup routes
app.post('/progress/lesson-completion', ProgressController.updateLessonCompletion);
app.get('/progress/course/:courseId/student/:studentId', ProgressController.getCourseProgress);
app.get('/progress/student/:studentId/summary', ProgressController.getStudentProgressSummary);
app.get('/progress/parent/children', ProgressController.getParentProgressView);
app.get('/progress/teacher/overview', ProgressController.getTeacherProgressOverview);
app.get('/progress/course/:courseId/stats', ProgressController.getCourseCompletionStats);

describe('ProgressController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /progress/lesson-completion', () => {
    it('should update lesson completion for student', async () => {
      const { prisma } = require('../config/database');
      
      // Mock student lookup
      prisma.student.findUnique.mockResolvedValue({
        id: 'student-1',
        userId: 'user-1',
      });

      // Mock service method
      (ProgressService.updateLessonCompletion as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/progress/lesson-completion')
        .send({
          lessonId: 'lesson-1',
          completed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Lesson completion updated successfully');
      expect(ProgressService.updateLessonCompletion).toHaveBeenCalledWith({
        lessonId: 'lesson-1',
        studentId: 'student-1',
        completed: true,
      });
    });

    it('should return 404 if student not found', async () => {
      const { prisma } = require('../config/database');
      
      prisma.student.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/progress/lesson-completion')
        .send({
          lessonId: 'lesson-1',
          completed: true,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should handle parent updating child completion', async () => {
      // Mock parent user
      const mockAuthMiddlewareParent = (req: any, res: any, next: any) => {
        req.user = {
          id: 'user-parent',
          role: Role.PARENT,
        };
        next();
      };

      const parentApp = express();
      parentApp.use(express.json());
      parentApp.use(mockAuthMiddlewareParent);
      parentApp.post('/progress/lesson-completion', ProgressController.updateLessonCompletion);

      const { prisma } = require('../config/database');
      
      // Mock parent lookup
      prisma.parent.findUnique.mockResolvedValue({
        id: 'parent-1',
        userId: 'user-parent',
        children: [{ id: 'child-1' }],
      });

      (ProgressService.updateLessonCompletion as jest.Mock).mockResolvedValue(undefined);

      const response = await request(parentApp)
        .post('/progress/lesson-completion')
        .send({
          lessonId: 'lesson-1',
          completed: true,
          childId: 'child-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /progress/course/:courseId/student/:studentId', () => {
    it('should return course progress for student', async () => {
      const { prisma } = require('../config/database');
      
      prisma.student.findUnique.mockResolvedValue({
        id: 'student-1',
        userId: 'user-1',
      });

      const mockProgress = {
        courseId: 'course-1',
        courseTitle: 'Test Course',
        studentId: 'student-1',
        totalLessons: 10,
        completedLessons: 5,
        progressPercentage: 50,
        sections: [],
        enrolledAt: new Date(),
      };

      (ProgressService.getCourseProgress as jest.Mock).mockResolvedValue(mockProgress);

      const response = await request(app)
        .get('/progress/course/course-1/student/student-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockProgress,
        enrolledAt: expect.any(String),
      });
    });

    it('should return 403 if student tries to access other student progress', async () => {
      const { prisma } = require('../config/database');
      
      prisma.student.findUnique.mockResolvedValue({
        id: 'student-1',
        userId: 'user-1',
      });

      const response = await request(app)
        .get('/progress/course/course-1/student/other-student');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED_ACCESS');
    });
  });

  describe('GET /progress/student/:studentId/summary', () => {
    it('should return student progress summary', async () => {
      const { prisma } = require('../config/database');
      
      prisma.student.findUnique.mockResolvedValue({
        id: 'student-1',
        userId: 'user-1',
      });

      const mockSummary = {
        studentId: 'student-1',
        studentName: 'Test Student',
        studentEmail: 'student@test.com',
        totalCourses: 2,
        totalLessonsCompleted: 15,
        totalLessonsAvailable: 30,
        overallProgressPercentage: 50,
        courseProgresses: [],
      };

      (ProgressService.getStudentProgressSummary as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/progress/student/student-1/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSummary);
    });
  });

  describe('GET /progress/parent/children', () => {
    it('should return children progress for parent', async () => {
      // Mock parent user
      const mockAuthMiddlewareParent = (req: any, res: any, next: any) => {
        req.user = {
          id: 'user-parent',
          role: Role.PARENT,
        };
        next();
      };

      const parentApp = express();
      parentApp.use(express.json());
      parentApp.use(mockAuthMiddlewareParent);
      parentApp.get('/progress/parent/children', ProgressController.getParentProgressView);

      const { prisma } = require('../config/database');
      
      prisma.parent.findUnique.mockResolvedValue({
        id: 'parent-1',
        userId: 'user-parent',
      });

      const mockChildrenProgress = [
        {
          childId: 'child-1',
          childName: 'Child 1',
          childEmail: 'child1@test.com',
          progressSummary: {
            studentId: 'child-1',
            studentName: 'Child 1',
            studentEmail: 'child1@test.com',
            totalCourses: 1,
            totalLessonsCompleted: 5,
            totalLessonsAvailable: 10,
            overallProgressPercentage: 50,
            courseProgresses: [],
          },
        },
      ];

      (ProgressService.getParentProgressView as jest.Mock).mockResolvedValue(mockChildrenProgress);

      const response = await request(parentApp)
        .get('/progress/parent/children');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockChildrenProgress);
    });

    it('should return 403 for non-parent users', async () => {
      const response = await request(app)
        .get('/progress/parent/children');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /progress/teacher/overview', () => {
    it('should return teacher progress overview', async () => {
      // Mock teacher user
      const mockAuthMiddlewareTeacher = (req: any, res: any, next: any) => {
        req.user = {
          id: 'user-teacher',
          role: Role.TEACHER,
        };
        next();
      };

      const teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use(mockAuthMiddlewareTeacher);
      teacherApp.get('/progress/teacher/overview', ProgressController.getTeacherProgressOverview);

      const { prisma } = require('../config/database');
      
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        userId: 'user-teacher',
      });

      const mockOverview = [
        {
          courseId: 'course-1',
          courseTitle: 'Course 1',
          totalStudents: 5,
          averageProgress: 75,
          studentsProgress: [],
        },
      ];

      (ProgressService.getTeacherProgressOverview as jest.Mock).mockResolvedValue(mockOverview);

      const response = await request(teacherApp)
        .get('/progress/teacher/overview');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOverview);
    });

    it('should return 403 for non-teacher/admin users', async () => {
      const response = await request(app)
        .get('/progress/teacher/overview');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /progress/course/:courseId/stats', () => {
    it('should return course completion stats for teacher', async () => {
      // Mock teacher user
      const mockAuthMiddlewareTeacher = (req: any, res: any, next: any) => {
        req.user = {
          id: 'user-teacher',
          role: Role.TEACHER,
        };
        next();
      };

      const teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use(mockAuthMiddlewareTeacher);
      teacherApp.get('/progress/course/:courseId/stats', ProgressController.getCourseCompletionStats);

      const { prisma } = require('../config/database');
      
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        userId: 'user-teacher',
        courses: [{ id: 'course-1' }],
      });

      const mockStats = {
        totalStudents: 10,
        studentsCompleted: 3,
        completionRate: 30,
        averageProgress: 65,
      };

      (ProgressService.getCourseCompletionStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(teacherApp)
        .get('/progress/course/course-1/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should return 403 for unauthorized course access', async () => {
      // Mock teacher user
      const mockAuthMiddlewareTeacher = (req: any, res: any, next: any) => {
        req.user = {
          id: 'user-teacher',
          role: Role.TEACHER,
        };
        next();
      };

      const teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use(mockAuthMiddlewareTeacher);
      teacherApp.get('/progress/course/:courseId/stats', ProgressController.getCourseCompletionStats);

      const { prisma } = require('../config/database');
      
      prisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        userId: 'user-teacher',
        courses: [], // No courses assigned
      });

      const response = await request(teacherApp)
        .get('/progress/course/course-1/stats');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED_COURSE_ACCESS');
    });
  });
});