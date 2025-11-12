import { ParentService } from '../services/parent.service';
import { prisma } from '../config/database';
import { ProgressService } from '../services/progress.service';

// Mock dependencies
jest.mock('../config/database', () => ({
  prisma: {
    parent: {
      findUnique: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
    enrollmentRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    attempt: {
      findMany: jest.fn(),
    },
    completion: {
      findFirst: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../services/progress.service');

describe('ParentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChildrenProfiles', () => {
    it('should return children profiles for a valid parent', async () => {
      const mockParent = {
        id: 'parent-1',
        userId: 'user-1',
        children: [
          {
            id: 'child-1',
            user: {
              id: 'user-2',
              name: 'Child One',
              email: 'child1@example.com',
            },
            enrollments: [
              {
                course: {
                  id: 'course-1',
                  title: 'Math Course',
                  description: 'Basic Math',
                  teacher: {
                    user: { name: 'Teacher One' },
                  },
                },
                createdAt: new Date(),
              },
            ],
          },
        ],
      };

      const mockProgress = {
        completedLessons: 5,
        totalLessons: 10,
        progressPercentage: 50,
      };

      const mockRecentActivity = [
        {
          lessonId: 'lesson-1',
          lessonTitle: 'Lesson 1',
          courseTitle: 'Math Course',
          completedAt: new Date(),
        },
      ];

      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(mockParent);
      (ProgressService.calculateCourseProgressPercentage as jest.Mock).mockResolvedValue(mockProgress);
      (ProgressService.getRecentCompletions as jest.Mock).mockResolvedValue(mockRecentActivity);

      const result = await ParentService.getChildrenProfiles('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Child One');
      expect(result[0].enrolledCourses).toHaveLength(1);
      expect(result[0].enrolledCourses[0].progress.progressPercentage).toBe(50);
    });

    it('should throw error if parent not found', async () => {
      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ParentService.getChildrenProfiles('invalid-user')).rejects.toThrow('Parent profile not found');
    });
  });

  describe('getChildProgress', () => {
    it('should return detailed progress report for a child', async () => {
      const mockParent = {
        id: 'parent-1',
        children: [{ id: 'child-1' }],
      };

      const mockProgressSummary = {
        studentId: 'child-1',
        studentName: 'Child One',
        totalCourses: 2,
        totalLessonsCompleted: 8,
        totalLessonsAvailable: 20,
        overallProgressPercentage: 40,
        courseProgresses: [
          {
            courseId: 'course-1',
            courseTitle: 'Math Course',
            progressPercentage: 50,
          },
        ],
      };

      const mockCourseDetails = {
        id: 'course-1',
        teacher: {
          user: { name: 'Teacher One' },
        },
      };

      const mockLastActivity = {
        updatedAt: new Date(),
      };

      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(mockParent);
      (ProgressService.getStudentProgressSummary as jest.Mock).mockResolvedValue(mockProgressSummary);
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourseDetails);
      (prisma.completion.findFirst as jest.Mock).mockResolvedValue(mockLastActivity);
      (ParentService.getChildQuizResults as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await ParentService.getChildProgress('user-1', 'child-1');

      expect(result.studentName).toBe('Child One');
      expect(result.totalCourses).toBe(2);
      expect(result.overallProgress).toBe(40);
      expect(result.courseProgress).toHaveLength(1);
    });

    it('should throw error if child does not belong to parent', async () => {
      const mockParent = {
        id: 'parent-1',
        children: [],
      };

      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(mockParent);

      await expect(ParentService.getChildProgress('user-1', 'child-1')).rejects.toThrow('Child does not belong to this parent');
    });
  });

  describe('getChildQuizResults', () => {
    it('should be defined', () => {
      expect(ParentService.getChildQuizResults).toBeDefined();
      expect(typeof ParentService.getChildQuizResults).toBe('function');
    });
  });

  describe('createEnrollmentRequestForChild', () => {
    it('should create enrollment request for child', async () => {
      const mockParent = {
        id: 'parent-1',
        children: [{ id: 'child-1' }],
      };

      const mockCourse = {
        id: 'course-1',
        title: 'Math Course',
      };

      const mockEnrollmentRequest = {
        id: 'request-1',
        studentId: 'child-1',
        courseId: 'course-1',
        message: 'Enrollment request',
        status: 'PENDING',
        student: {
          user: {
            id: 'user-2',
            name: 'Child One',
            email: 'child1@example.com',
          },
        },
        course: {
          id: 'course-1',
          title: 'Math Course',
          description: 'Basic Math',
        },
      };

      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(mockParent);
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.enrollmentRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.enrollmentRequest.create as jest.Mock).mockResolvedValue(mockEnrollmentRequest);

      const result = await ParentService.createEnrollmentRequestForChild('user-1', 'child-1', 'course-1', 'Test message');

      expect(result.studentId).toBe('child-1');
      expect(result.courseId).toBe('course-1');
      expect(result.status).toBe('PENDING');
    });

    it('should throw error if child is already enrolled', async () => {
      const mockParent = {
        id: 'parent-1',
        children: [{ id: 'child-1' }],
      };

      const mockCourse = {
        id: 'course-1',
        title: 'Math Course',
      };

      const mockExistingEnrollment = {
        id: 'enrollment-1',
        studentId: 'child-1',
        courseId: 'course-1',
      };

      (prisma.parent.findUnique as jest.Mock).mockResolvedValue(mockParent);
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockExistingEnrollment);

      await expect(
        ParentService.createEnrollmentRequestForChild('user-1', 'child-1', 'course-1')
      ).rejects.toThrow('Child is already enrolled in this course');
    });
  });

  describe('getParentDashboardSummary', () => {
    it('should return dashboard summary for parent', async () => {
      const mockChildrenProfiles = [
        {
          id: 'child-1',
          userId: 'user-2',
          name: 'Child One',
          email: 'child1@example.com',
          enrolledCourses: [
            {
              id: 'course-1',
              title: 'Math Course',
              description: 'Basic Math',
              enrolledAt: new Date(),
              progress: { 
                completedLessons: 3,
                totalLessons: 4,
                progressPercentage: 75 
              },
            },
            {
              id: 'course-2',
              title: 'Science Course',
              description: 'Basic Science',
              enrolledAt: new Date(),
              progress: { 
                completedLessons: 5,
                totalLessons: 5,
                progressPercentage: 100 
              },
            },
          ],
          recentActivity: [
            {
              lessonId: 'lesson-1',
              lessonTitle: 'Lesson 1',
              courseTitle: 'Math Course',
              completedAt: new Date(),
            },
          ],
        },
      ];

      jest.spyOn(ParentService, 'getChildrenProfiles').mockResolvedValue(mockChildrenProfiles);

      const result = await ParentService.getParentDashboardSummary('user-1');

      expect(result.totalChildren).toBe(1);
      expect(result.totalCourses).toBe(2);
      expect(result.totalCompletedCourses).toBe(1);
      expect(result.averageProgress).toBe(88); // (75 + 100) / 2 = 87.5, rounded to 88
      expect(result.recentActivity).toHaveLength(1);
    });
  });
});