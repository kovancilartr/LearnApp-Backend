import { CourseService } from '../services/course.service';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

// Mock Prisma
jest.mock('../config/database', () => ({
  prisma: {
    course: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    section: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lesson: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    enrollment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    teacher: {
      findUnique: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
    },
    completion: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('CourseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a new course successfully', async () => {
      const mockCourse = {
        id: 'course-1',
        title: 'Test Course',
        description: 'Test Description',
        teacherId: 'teacher-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: {
          id: 'teacher-1',
          user: {
            id: 'user-1',
            name: 'Teacher Name',
            email: 'teacher@test.com',
          },
        },
        sections: [],
        enrollments: [],
        _count: {
          enrollments: 0,
          sections: 0,
        },
      };

      (prisma.course.create as jest.Mock).mockResolvedValue(mockCourse);

      const result = await CourseService.createCourse({
        title: 'Test Course',
        description: 'Test Description',
        teacherId: 'teacher-1',
      });

      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Course',
          description: 'Test Description',
          teacherId: 'teacher-1',
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCourse);
    });

    it('should create course without teacher', async () => {
      const mockCourse = {
        id: 'course-1',
        title: 'Test Course',
        description: 'Test Description',
        teacherId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: null,
        sections: [],
        enrollments: [],
        _count: {
          enrollments: 0,
          sections: 0,
        },
      };

      (prisma.course.create as jest.Mock).mockResolvedValue(mockCourse);

      const result = await CourseService.createCourse({
        title: 'Test Course',
        description: 'Test Description',
      });

      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Course',
          description: 'Test Description',
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCourse);
    });
  });

  describe('getCourseById', () => {
    it('should get course by ID successfully', async () => {
      const mockCourse = {
        id: 'course-1',
        title: 'Test Course',
        description: 'Test Description',
        teacherId: 'teacher-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: {
          id: 'teacher-1',
          user: {
            id: 'user-1',
            name: 'Teacher Name',
            email: 'teacher@test.com',
          },
        },
        sections: [],
        enrollments: [],
        _count: {
          enrollments: 0,
          sections: 0,
        },
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);

      const result = await CourseService.getCourseById('course-1');

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCourse);
    });

    it('should throw error if course not found', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CourseService.getCourseById('non-existent')).rejects.toThrow('Course not found');
    });
  });

  describe('assignTeacherToCourse', () => {
    it('should assign teacher to course successfully', async () => {
      const mockTeacher = { id: 'teacher-1' };
      const mockCourse = { id: 'course-1' };
      const mockUpdatedCourse = {
        id: 'course-1',
        title: 'Test Course',
        teacherId: 'teacher-1',
        teacher: {
          id: 'teacher-1',
          user: {
            id: 'user-1',
            name: 'Teacher Name',
            email: 'teacher@test.com',
          },
        },
        sections: [],
        enrollments: [],
        _count: {
          enrollments: 0,
          sections: 0,
        },
      };

      (prisma.teacher.findUnique as jest.Mock).mockResolvedValue(mockTeacher);
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.course.update as jest.Mock).mockResolvedValue(mockUpdatedCourse);

      const result = await CourseService.assignTeacherToCourse({
        courseId: 'course-1',
        teacherId: 'teacher-1',
      });

      expect(prisma.teacher.findUnique).toHaveBeenCalledWith({
        where: { id: 'teacher-1' },
      });

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: 'course-1' },
      });

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { teacherId: 'teacher-1' },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockUpdatedCourse);
    });

    it('should throw error if teacher not found', async () => {
      (prisma.teacher.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CourseService.assignTeacherToCourse({
        courseId: 'course-1',
        teacherId: 'non-existent',
      })).rejects.toThrow('Teacher not found');
    });

    it('should throw error if course not found', async () => {
      const mockTeacher = { id: 'teacher-1' };
      (prisma.teacher.findUnique as jest.Mock).mockResolvedValue(mockTeacher);
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CourseService.assignTeacherToCourse({
        courseId: 'non-existent',
        teacherId: 'teacher-1',
      })).rejects.toThrow('Course not found');
    });
  });

  describe('enrollStudent', () => {
    it('should enroll student in course successfully', async () => {
      const mockCourse = { id: 'course-1' };
      const mockStudent = { id: 'student-1' };
      const mockEnrollment = {
        id: 'enrollment-1',
        studentId: 'student-1',
        courseId: 'course-1',
        createdAt: new Date(),
        student: {
          id: 'student-1',
          user: {
            id: 'user-1',
            name: 'Student Name',
            email: 'student@test.com',
          },
        },
        course: {
          id: 'course-1',
          title: 'Test Course',
          description: 'Test Description',
        },
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.enrollment.create as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await CourseService.enrollStudent({
        courseId: 'course-1',
        studentId: 'student-1',
      });

      expect(prisma.enrollment.create).toHaveBeenCalledWith({
        data: {
          studentId: 'student-1',
          courseId: 'course-1',
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockEnrollment);
    });

    it('should throw error if student already enrolled', async () => {
      const mockCourse = { id: 'course-1' };
      const mockStudent = { id: 'student-1' };
      const mockExistingEnrollment = { id: 'enrollment-1' };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockExistingEnrollment);

      await expect(CourseService.enrollStudent({
        courseId: 'course-1',
        studentId: 'student-1',
      })).rejects.toThrow('Student is already enrolled in this course');
    });
  });

  describe('createSection', () => {
    it('should create section successfully', async () => {
      const mockCourse = {
        id: 'course-1',
        teacher: {
          user: { id: 'user-1' },
        },
      };
      const mockLastSection = { order: 2 };
      const mockSection = {
        id: 'section-1',
        title: 'Test Section',
        order: 3,
        courseId: 'course-1',
        lessons: [],
        course: {
          id: 'course-1',
          title: 'Test Course',
        },
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(mockLastSection);
      (prisma.section.create as jest.Mock).mockResolvedValue(mockSection);

      const result = await CourseService.createSection(
        {
          title: 'Test Section',
          courseId: 'course-1',
        },
        'user-1',
        Role.TEACHER
      );

      expect(prisma.section.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Section',
          order: 3,
          courseId: 'course-1',
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockSection);
    });

    it('should throw error if user has insufficient permissions', async () => {
      const mockCourse = {
        id: 'course-1',
        teacher: {
          user: { id: 'other-user' },
        },
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);

      await expect(CourseService.createSection(
        {
          title: 'Test Section',
          courseId: 'course-1',
        },
        'user-1',
        Role.TEACHER
      )).rejects.toThrow('Insufficient permissions to create section in this course');
    });
  });

  describe('getCourseProgress', () => {
    it('should get course progress successfully', async () => {
      const mockCourse = {
        id: 'course-1',
        title: 'Test Course',
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            order: 1,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Lesson 1',
                order: 1,
                completions: [{ completed: true, createdAt: new Date() }],
              },
              {
                id: 'lesson-2',
                title: 'Lesson 2',
                order: 2,
                completions: [],
              },
            ],
          },
        ],
      };
      const mockEnrollment = {
        id: 'enrollment-1',
        createdAt: new Date(),
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockEnrollment);

      const result = await CourseService.getCourseProgress('course-1', 'student-1');

      expect(result.totalLessons).toBe(2);
      expect(result.completedLessons).toBe(1);
      expect(result.progressPercentage).toBe(50);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].lessons).toHaveLength(2);
      expect(result.sections[0].lessons[0].completed).toBe(true);
      expect(result.sections[0].lessons[1].completed).toBe(false);
    });

    it('should throw error if student not enrolled', async () => {
      const mockCourse = { id: 'course-1' };
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CourseService.getCourseProgress('course-1', 'student-1'))
        .rejects.toThrow('Student is not enrolled in this course');
    });
  });
});