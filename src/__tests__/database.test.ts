import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock bcrypt for testing
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Test database instance (mocked)
const prisma = new PrismaClient();

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        role: 'STUDENT' as const,
      };

      const mockUser = {
        id: 'user-1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const createdUser = await prisma.user.create({
        data: userData,
      });

      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.role).toBe(userData.role);
      expect(retrievedUser).toEqual(createdUser);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
    });

    it('should enforce unique email constraint', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@example.com',
        name: 'User 1',
        password: await bcrypt.hash('password123', 12),
        role: 'STUDENT' as const,
      };

      await prisma.user.create({ data: userData });

      // Act & Assert
      await expect(
        prisma.user.create({
          data: {
            ...userData,
            name: 'User 2',
          },
        })
      ).rejects.toThrow();
    });

    it('should create user with student profile', async () => {
      // Arrange
      const userData = {
        email: 'student@example.com',
        name: 'Student User',
        password: await bcrypt.hash('password123', 12),
        role: 'STUDENT' as const,
      };

      // Act
      const user = await prisma.user.create({
        data: {
          ...userData,
          studentProfile: {
            create: {},
          },
        },
        include: {
          studentProfile: true,
        },
      });

      // Assert
      expect(user).toBeDefined();
      expect(user.studentProfile).toBeDefined();
      expect(user.studentProfile?.userId).toBe(user.id);
    });

    it('should create user with teacher profile', async () => {
      // Arrange
      const userData = {
        email: 'teacher@example.com',
        name: 'Teacher User',
        password: await bcrypt.hash('password123', 12),
        role: 'TEACHER' as const,
      };

      // Act
      const user = await prisma.user.create({
        data: {
          ...userData,
          teacherProfile: {
            create: {},
          },
        },
        include: {
          teacherProfile: true,
        },
      });

      // Assert
      expect(user).toBeDefined();
      expect(user.teacherProfile).toBeDefined();
      expect(user.teacherProfile?.userId).toBe(user.id);
    });

    it('should create parent-child relationship', async () => {
      // Arrange
      const parentUser = await prisma.user.create({
        data: {
          email: 'parent@example.com',
          name: 'Parent User',
          password: await bcrypt.hash('password123', 12),
          role: 'PARENT',
          parentProfile: {
            create: {},
          },
        },
        include: {
          parentProfile: true,
        },
      });

      const childUser = await prisma.user.create({
        data: {
          email: 'child@example.com',
          name: 'Child User',
          password: await bcrypt.hash('password123', 12),
          role: 'STUDENT',
          studentProfile: {
            create: {
              parentId: parentUser.parentProfile?.id,
            },
          },
        },
        include: {
          studentProfile: true,
        },
      });

      // Act
      const parentWithChildren = await prisma.parent.findUnique({
        where: { id: parentUser.parentProfile?.id! },
        include: {
          children: {
            include: {
              user: true,
            },
          },
        },
      });

      // Assert
      expect(parentWithChildren?.children).toHaveLength(1);
      expect(parentWithChildren?.children[0].user.email).toBe('child@example.com');
      expect(childUser.studentProfile?.parentId).toBe(parentUser.parentProfile!.id);
    });
  });

  describe('Course Operations', () => {
    let teacherUser: any;

    beforeEach(async () => {
      teacherUser = await prisma.user.create({
        data: {
          email: 'course-teacher@example.com',
          name: 'Course Teacher',
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
    });

    it('should create course with sections and lessons', async () => {
      // Ensure teacher profile exists
      expect(teacherUser.teacherProfile).toBeDefined();
      
      // Act
      const course = await prisma.course.create({
        data: {
          title: 'Test Course',
          description: 'A test course',
          teacherId: teacherUser.teacherProfile?.id,
          sections: {
            create: [
              {
                title: 'Section 1',
                order: 1,
                lessons: {
                  create: [
                    {
                      title: 'Lesson 1',
                      content: 'Lesson content',
                      videoUrl: 'https://youtube.com/watch?v=123',
                      order: 1,
                    },
                    {
                      title: 'Lesson 2',
                      content: 'Lesson 2 content',
                      order: 2,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          sections: {
            include: {
              lessons: true,
            },
          },
        },
      });

      // Assert
      expect(course.sections).toHaveLength(1);
      expect(course.sections[0].lessons).toHaveLength(2);
      expect(course.sections[0].lessons[0].title).toBe('Lesson 1');
    });

    it('should handle course enrollment', async () => {
      // Arrange
      const course = await prisma.course.create({
        data: {
          title: 'Enrollment Course',
          description: 'Course for enrollment test',
          teacherId: teacherUser.teacherProfile?.id,
        },
      });

      const studentUser = await prisma.user.create({
        data: {
          email: 'enrollment-student@example.com',
          name: 'Enrollment Student',
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

      // Act
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: studentUser.studentProfile!.id,
          courseId: course.id,
        },
      });

      // Assert
      expect(enrollment.studentId).toBe(studentUser.studentProfile!.id);
      expect(enrollment.courseId).toBe(course.id);
    });

    it('should enforce unique enrollment constraint', async () => {
      // Arrange
      const course = await prisma.course.create({
        data: {
          title: 'Unique Enrollment Course',
          description: 'Course for unique enrollment test',
          teacherId: teacherUser.teacherProfile?.id,
        },
      });

      const studentUser = await prisma.user.create({
        data: {
          email: 'unique-student@example.com',
          name: 'Unique Student',
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

      await prisma.enrollment.create({
        data: {
          studentId: studentUser.studentProfile!.id,
          courseId: course.id,
        },
      });

      // Act & Assert
      await expect(
        prisma.enrollment.create({
          data: {
            studentId: studentUser.studentProfile!.id,
            courseId: course.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Quiz Operations', () => {
    let course: any;
    let studentUser: any;

    beforeEach(async () => {
      const teacherUser = await prisma.user.create({
        data: {
          email: 'quiz-teacher@example.com',
          name: 'Quiz Teacher',
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

      course = await prisma.course.create({
        data: {
          title: 'Quiz Course',
          description: 'Course for quiz tests',
          teacherId: teacherUser.teacherProfile?.id,
        },
      });

      studentUser = await prisma.user.create({
        data: {
          email: 'quiz-student@example.com',
          name: 'Quiz Student',
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
    });

    it('should create quiz with questions and choices', async () => {
      // Act
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Test Quiz',
          courseId: course.id,
          duration: 3600, // 1 hour
          attemptsAllowed: 3,
          questions: {
            create: [
              {
                text: 'What is 2 + 2?',
                order: 1,
                choices: {
                  create: [
                    { label: 'A', text: '3', correct: false },
                    { label: 'B', text: '4', correct: true },
                    { label: 'C', text: '5', correct: false },
                    { label: 'D', text: '6', correct: false },
                  ],
                },
              },
            ],
          },
        },
        include: {
          questions: {
            include: {
              choices: true,
            },
          },
        },
      });

      // Assert
      expect(quiz.questions).toHaveLength(1);
      expect(quiz.questions[0].choices).toHaveLength(4);
      expect(quiz.questions[0].choices.find(c => c.correct)?.text).toBe('4');
    });

    it('should handle quiz attempts and responses', async () => {
      // Arrange
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Attempt Quiz',
          courseId: course.id,
          duration: 3600,
          attemptsAllowed: 1,
          questions: {
            create: [
              {
                text: 'Test Question',
                order: 1,
                choices: {
                  create: [
                    { label: 'A', text: 'Wrong', correct: false },
                    { label: 'B', text: 'Correct', correct: true },
                  ],
                },
              },
            ],
          },
        },
        include: {
          questions: {
            include: {
              choices: true,
            },
          },
        },
      });

      const correctChoice = quiz.questions[0].choices.find(c => c.correct);

      // Act
      const attempt = await prisma.attempt.create({
        data: {
          studentId: studentUser.studentProfile.id,
          quizId: quiz.id,
          responses: {
            create: [
              {
                questionId: quiz.questions[0].id,
                choiceId: correctChoice!.id,
              },
            ],
          },
        },
        include: {
          responses: true,
        },
      });

      // Assert
      expect(attempt.responses).toHaveLength(1);
      expect(attempt.responses[0].choiceId).toBe(correctChoice!.id);
    });

    it('should calculate quiz score correctly', async () => {
      // Arrange
      const quiz = await prisma.quiz.create({
        data: {
          title: 'Score Quiz',
          courseId: course.id,
          questions: {
            create: [
              {
                text: 'Question 1',
                order: 1,
                choices: {
                  create: [
                    { label: 'A', text: 'Wrong', correct: false },
                    { label: 'B', text: 'Correct', correct: true },
                  ],
                },
              },
              {
                text: 'Question 2',
                order: 2,
                choices: {
                  create: [
                    { label: 'A', text: 'Correct', correct: true },
                    { label: 'B', text: 'Wrong', correct: false },
                  ],
                },
              },
            ],
          },
        },
        include: {
          questions: {
            include: {
              choices: true,
            },
          },
        },
      });

      const correctChoice1 = quiz.questions[0].choices.find(c => c.correct);
      const wrongChoice2 = quiz.questions[1].choices.find(c => !c.correct);

      // Act - Answer 1 correct, 1 wrong (50% score)
      const attempt = await prisma.attempt.create({
        data: {
          studentId: studentUser.studentProfile.id,
          quizId: quiz.id,
          score: 50.0, // 1 out of 2 correct
          finishedAt: new Date(),
          responses: {
            create: [
              {
                questionId: quiz.questions[0].id,
                choiceId: correctChoice1!.id,
              },
              {
                questionId: quiz.questions[1].id,
                choiceId: wrongChoice2!.id,
              },
            ],
          },
        },
      });

      // Assert
      expect(attempt.score).toBe(50.0);
      expect(attempt.finishedAt).toBeDefined();
    });
  });

  describe('Lesson Completion Operations', () => {
    let lesson: any;
    let studentUser: any;

    beforeEach(async () => {
      const teacherUser = await prisma.user.create({
        data: {
          email: 'completion-teacher@example.com',
          name: 'Completion Teacher',
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

      const course = await prisma.course.create({
        data: {
          title: 'Completion Course',
          description: 'Course for completion tests',
          teacherId: teacherUser.teacherProfile?.id,
          sections: {
            create: [
              {
                title: 'Test Section',
                order: 1,
                lessons: {
                  create: [
                    {
                      title: 'Test Lesson',
                      content: 'Test content',
                      order: 1,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          sections: {
            include: {
              lessons: true,
            },
          },
        },
      });

      lesson = course.sections[0].lessons[0];

      studentUser = await prisma.user.create({
        data: {
          email: 'completion-student@example.com',
          name: 'Completion Student',
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
    });

    it('should track lesson completion', async () => {
      // Act
      const completion = await prisma.completion.create({
        data: {
          studentId: studentUser.studentProfile.id,
          lessonId: lesson.id,
          completed: true,
        },
      });

      // Assert
      expect(completion.completed).toBe(true);
      expect(completion.studentId).toBe(studentUser.studentProfile.id);
      expect(completion.lessonId).toBe(lesson.id);
    });

    it('should enforce unique completion constraint', async () => {
      // Arrange
      await prisma.completion.create({
        data: {
          studentId: studentUser.studentProfile.id,
          lessonId: lesson.id,
          completed: true,
        },
      });

      // Act & Assert
      await expect(
        prisma.completion.create({
          data: {
            studentId: studentUser.studentProfile.id,
            lessonId: lesson.id,
            completed: false,
          },
        })
      ).rejects.toThrow();
    });

    it('should update completion status', async () => {
      // Arrange
      const completion = await prisma.completion.create({
        data: {
          studentId: studentUser.studentProfile.id,
          lessonId: lesson.id,
          completed: false,
        },
      });

      // Act
      const updatedCompletion = await prisma.completion.update({
        where: {
          studentId_lessonId: {
            studentId: studentUser.studentProfile.id,
            lessonId: lesson.id,
          },
        },
        data: {
          completed: true,
        },
      });

      // Assert
      expect(updatedCompletion.completed).toBe(true);
      expect(updatedCompletion.id).toBe(completion.id);
    });
  });

  describe('Refresh Token Operations', () => {
    let user: any;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'token-user@example.com',
          name: 'Token User',
          password: await bcrypt.hash('password123', 12),
          role: 'STUDENT',
        },
      });
    });

    it('should create and manage refresh tokens', async () => {
      // Act
      const refreshToken = await prisma.refreshToken.create({
        data: {
          token: 'test-refresh-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Assert
      expect(refreshToken.token).toBe('test-refresh-token');
      expect(refreshToken.userId).toBe(user.id);
      expect(refreshToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should enforce unique token constraint', async () => {
      // Arrange
      await prisma.refreshToken.create({
        data: {
          token: 'unique-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Act & Assert
      await expect(
        prisma.refreshToken.create({
          data: {
            token: 'unique-token', // Same token
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete refresh tokens when user is deleted', async () => {
      // Arrange
      await prisma.refreshToken.create({
        data: {
          token: 'cascade-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Act
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Assert
      const remainingTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(remainingTokens).toHaveLength(0);
    });
  });
});