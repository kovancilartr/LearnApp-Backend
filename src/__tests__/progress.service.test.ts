import { ProgressService } from '../services/progress.service';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

// Mock prisma
jest.mock('../config/database', () => ({
  prisma: {
    lesson: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    completion: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
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

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateLessonCompletion', () => {
    it('should update lesson completion successfully', async () => {
      const mockStudent = {
        id: 'student-1',
        user: {
          id: 'user-1',
          role: Role.STUDENT,
          name: 'Test Student',
          email: 'student@test.com',
        },
      };

      const mockLesson = {
        id: 'lesson-1',
        section: {
          course: {
            id: 'course-1',
            title: 'Test Course',
            teacherId: 'teacher-1',
          },
        },
      };

      const mockEnrollment = {
        id: 'enrollment-1',
        studentId: 'student-1',
        courseId: 'course-1',
      };

      const mockCompletion = {
        id: 'completion-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourseProgress = {
        courseId: 'course-1',
        completedLessons: 1,
        totalLessons: 10,
        progressPercentage: 10,
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockEnrollment);
      (prisma.completion.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.completion.upsert as jest.Mock).mockResolvedValue(mockCompletion);

      // Mock the calculateCourseProgressPercentage method
      jest.spyOn(ProgressService, 'calculateCourseProgressPercentage').mockResolvedValue(mockCourseProgress);

      const result = await ProgressService.updateLessonCompletion({
        lessonId: 'lesson-1',
        studentId: 'student-1',
        completed: true,
      });

      expect(result).toEqual({
        lessonId: 'lesson-1',
        studentId: 'student-1',
        completed: true,
        completedAt: expect.any(Date),
        previousStatus: false,
        toggleAction: 'completed',
        firstCompletedAt: expect.any(Date),
        lastModifiedAt: expect.any(Date),
        courseProgress: mockCourseProgress,
      });

      expect(prisma.student.findUnique).toHaveBeenCalledWith({
        where: { id: 'student-1' },
        include: {
          user: {
            select: { id: true, role: true, name: true, email: true }
          }
        }
      });

      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  teacherId: true
                }
              },
            },
          },
        },
      });

      expect(prisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: {
          studentId_courseId: {
            studentId: 'student-1',
            courseId: 'course-1',
          },
        },
      });
    });

    it('should throw error if student not found', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.updateLessonCompletion({
          lessonId: 'lesson-1',
          studentId: 'student-1',
          completed: true,
        })
      ).rejects.toThrow('Student not found or inactive');
    });

    it('should throw error if lesson not found', async () => {
      const mockStudent = {
        id: 'student-1',
        user: {
          id: 'user-1',
          role: Role.STUDENT,
          name: 'Test Student',
          email: 'student@test.com',
        },
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.updateLessonCompletion({
          lessonId: 'lesson-1',
          studentId: 'student-1',
          completed: true,
        })
      ).rejects.toThrow('Lesson not found or has been deleted');
    });

    it('should throw error if student not enrolled', async () => {
      const mockStudent = {
        id: 'student-1',
        user: {
          id: 'user-1',
          role: Role.STUDENT,
          name: 'Test Student',
          email: 'student@test.com',
        },
      };

      const mockLesson = {
        id: 'lesson-1',
        section: {
          course: {
            id: 'course-1',
            title: 'Test Course',
            teacherId: 'teacher-1',
          },
        },
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.updateLessonCompletion({
          lessonId: 'lesson-1',
          studentId: 'student-1',
          completed: true,
        })
      ).rejects.toThrow('Access denied: Student is not enrolled in this course');
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress successfully', async () => {
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
                completions: [
                  {
                    completed: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ],
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

      const result = await ProgressService.getCourseProgress('course-1', 'student-1');

      expect(result).toEqual({
        courseId: 'course-1',
        courseTitle: 'Test Course',
        studentId: 'student-1',
        totalLessons: 2,
        completedLessons: 1,
        progressPercentage: 50,
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
                completed: true,
                completedAt: expect.any(Date),
              },
              {
                id: 'lesson-2',
                title: 'Lesson 2',
                order: 2,
                completed: false,
                completedAt: undefined,
              },
            ],
          },
        ],
        enrolledAt: expect.any(Date),
      });
    });

    it('should throw error if course not found', async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.getCourseProgress('course-1', 'student-1')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error if student not enrolled', async () => {
      const mockCourse = {
        id: 'course-1',
        title: 'Test Course',
        sections: [],
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.getCourseProgress('course-1', 'student-1')
      ).rejects.toThrow('Student is not enrolled in this course');
    });
  });

  describe('getStudentProgressSummary', () => {
    it('should return student progress summary successfully', async () => {
      const mockStudent = {
        id: 'student-1',
        user: {
          id: 'user-1',
          name: 'Test Student',
          email: 'student@test.com',
        },
        enrollments: [
          {
            course: {
              id: 'course-1',
              title: 'Course 1',
            },
          },
        ],
      };

      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);

      // Mock getCourseProgress method
      const mockCourseProgress = {
        courseId: 'course-1',
        courseTitle: 'Course 1',
        studentId: 'student-1',
        totalLessons: 10,
        completedLessons: 5,
        progressPercentage: 50,
        sections: [],
        enrolledAt: new Date(),
      };

      jest.spyOn(ProgressService, 'getCourseProgress').mockResolvedValue(mockCourseProgress);

      const result = await ProgressService.getStudentProgressSummary('student-1');

      expect(result).toEqual({
        studentId: 'student-1',
        studentName: 'Test Student',
        studentEmail: 'student@test.com',
        totalCourses: 1,
        totalLessonsCompleted: 5,
        totalLessonsAvailable: 10,
        overallProgressPercentage: 50,
        courseProgresses: [mockCourseProgress],
      });
    });

    it('should throw error if student not found', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgressService.getStudentProgressSummary('student-1')
      ).rejects.toThrow('Student not found');
    });
  });

  describe('getLessonCompletionStatus', () => {
    it('should return true if lesson is completed', async () => {
      const mockCompletion = {
        completed: true,
      };

      (prisma.completion.findUnique as jest.Mock).mockResolvedValue(mockCompletion);

      const result = await ProgressService.getLessonCompletionStatus('lesson-1', 'student-1');

      expect(result).toBe(true);
      expect(prisma.completion.findUnique).toHaveBeenCalledWith({
        where: {
          studentId_lessonId: {
            studentId: 'student-1',
            lessonId: 'lesson-1',
          },
        },
      });
    });

    it('should return false if lesson is not completed', async () => {
      (prisma.completion.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await ProgressService.getLessonCompletionStatus('lesson-1', 'student-1');

      expect(result).toBe(false);
    });
  });

  describe('getCourseCompletionStats', () => {
    it('should return course completion statistics', async () => {
      const mockEnrollments = [
        { student: { id: 'student-1' } },
        { student: { id: 'student-2' } },
      ];

      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue(mockEnrollments);

      // Mock getCourseProgress for each student
      jest.spyOn(ProgressService, 'getCourseProgress')
        .mockResolvedValueOnce({
          courseId: 'course-1',
          courseTitle: 'Course 1',
          studentId: 'student-1',
          totalLessons: 10,
          completedLessons: 10,
          progressPercentage: 100,
          sections: [],
          enrolledAt: new Date(),
        })
        .mockResolvedValueOnce({
          courseId: 'course-1',
          courseTitle: 'Course 1',
          studentId: 'student-2',
          totalLessons: 10,
          completedLessons: 5,
          progressPercentage: 50,
          sections: [],
          enrolledAt: new Date(),
        });

      const result = await ProgressService.getCourseCompletionStats('course-1');

      expect(result).toEqual({
        totalStudents: 2,
        studentsCompleted: 1,
        completionRate: 50,
        averageProgress: 75,
      });
    });

    it('should return zero stats for course with no enrollments', async () => {
      (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ProgressService.getCourseCompletionStats('course-1');

      expect(result).toEqual({
        totalStudents: 0,
        studentsCompleted: 0,
        completionRate: 0,
        averageProgress: 0,
      });
    });
  });
});