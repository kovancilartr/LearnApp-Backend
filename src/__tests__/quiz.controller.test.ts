import request from 'supertest';
import app from '../index';
import { QuizService } from '../services/quiz.service';
import { Role } from '@prisma/client';

// Mock the QuizService
jest.mock('../services/quiz.service');
const mockQuizService = QuizService as jest.Mocked<typeof QuizService>;

// Mock auth middleware
jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      role: Role.TEACHER,
    };
    next();
  },
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      role: Role.TEACHER,
    };
    next();
  },
}));

// Mock role middleware
jest.mock('../middleware/role.middleware', () => ({
  roleMiddleware: (roles: any) => (req: any, res: any, next: any) => {
    next();
  },
  requireRole: (roles: any) => (req: any, res: any, next: any) => {
    next();
  },
}));

// Mock validation middleware
jest.mock('../middleware/validation.middleware', () => ({
  validationMiddleware: (schema: any) => (req: any, res: any, next: any) => {
    next();
  },
  validateRequest: (schema: any) => (req: any, res: any, next: any) => {
    next();
  },
}));

describe('Quiz Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/quizzes', () => {
    const mockQuizData = {
      title: 'Test Quiz',
      courseId: 'course-1',
      duration: 3600,
      attemptsAllowed: 2,
    };

    const mockCreatedQuiz = {
      id: 'quiz-1',
      title: 'Test Quiz',
      courseId: 'course-1',
      duration: 3600,
      attemptsAllowed: 2,
      createdAt: '2025-10-07T21:00:55.693Z',
      course: {
        id: 'course-1',
        title: 'Test Course',
      },
      questions: [],
      attempts: [],
      _count: {
        questions: 0,
        attempts: 0,
      },
    };

    it('should create quiz successfully', async () => {
      mockQuizService.createQuiz.mockResolvedValue(mockCreatedQuiz as any);

      const response = await request(app)
        .post('/api/quizzes')
        .send(mockQuizData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedQuiz);
      expect(mockQuizService.createQuiz).toHaveBeenCalledWith(
        mockQuizData,
        'test-user-id',
        Role.TEACHER
      );
    });

    it('should return 400 for invalid quiz data', async () => {
      const invalidData = {
        title: '', // Empty title
        courseId: 'invalid-uuid',
        duration: -1, // Invalid duration
      };

      const response = await request(app)
        .post('/api/quizzes')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when service throws error', async () => {
      mockQuizService.createQuiz.mockRejectedValue(new Error('Course not found'));

      const response = await request(app)
        .post('/api/quizzes')
        .send(mockQuizData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CREATE_QUIZ_FAILED');
      expect(response.body.error.message).toBe('Course not found');
    });
  });

  describe('GET /api/quizzes/:id', () => {
    const mockQuiz = {
      id: 'quiz-1',
      title: 'Test Quiz',
      courseId: 'course-1',
      duration: 3600,
      attemptsAllowed: 2,
      createdAt: '2025-10-07T21:00:55.693Z',
      course: {
        id: 'course-1',
        title: 'Test Course',
      },
      questions: [
        {
          id: 'question-1',
          text: 'What is 2 + 2?',
          choices: [
            { id: 'choice-1', label: 'A', text: '3', correct: false },
            { id: 'choice-2', label: 'B', text: '4', correct: true },
          ],
        },
      ],
      attempts: [],
      _count: {
        questions: 1,
        attempts: 0,
      },
    };

    it('should get quiz by ID successfully', async () => {
      mockQuizService.getQuizById.mockResolvedValue(mockQuiz as any);

      const response = await request(app)
        .get('/api/quizzes/quiz-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuiz);
      expect(mockQuizService.getQuizById).toHaveBeenCalledWith(
        'quiz-1',
        'test-user-id',
        Role.TEACHER
      );
    });

    it('should return 404 when quiz not found', async () => {
      mockQuizService.getQuizById.mockRejectedValue(new Error('Quiz not found'));

      const response = await request(app)
        .get('/api/quizzes/nonexistent-quiz')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GET_QUIZ_FAILED');
    });
  });

  describe('GET /api/quizzes', () => {
    const mockQuizList = {
      items: [
        {
          id: 'quiz-1',
          title: 'Test Quiz 1',
          courseId: 'course-1',
          courseName: 'Test Course',
          duration: 3600,
          attemptsAllowed: 2,
          createdAt: new Date(),
          questionCount: 5,
          attemptCount: 10,
        },
        {
          id: 'quiz-2',
          title: 'Test Quiz 2',
          courseId: 'course-1',
          courseName: 'Test Course',
          duration: 1800,
          attemptsAllowed: 1,
          createdAt: new Date(),
          questionCount: 3,
          attemptCount: 5,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should get all quizzes successfully', async () => {
      mockQuizService.getAllQuizzes.mockResolvedValue(mockQuizList as any);

      const response = await request(app)
        .get('/api/quizzes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuizList);
      expect(mockQuizService.getAllQuizzes).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should handle query parameters', async () => {
      mockQuizService.getAllQuizzes.mockResolvedValue(mockQuizList as any);

      const response = await request(app)
        .get('/api/quizzes?courseId=course-1&search=test&page=2&limit=5')
        .expect(200);

      expect(mockQuizService.getAllQuizzes).toHaveBeenCalledWith({
        courseId: 'course-1',
        search: 'test',
        page: 2,
        limit: 5,
      });
    });
  });

  describe('POST /api/quizzes/:id/questions', () => {
    const mockQuestionData = {
      text: 'What is 2 + 2?',
      choices: [
        { label: 'A', text: '3', correct: false },
        { label: 'B', text: '4', correct: true },
        { label: 'C', text: '5', correct: false },
      ],
    };

    const mockCreatedQuestion = {
      id: 'question-1',
      text: 'What is 2 + 2?',
      quizId: 'quiz-1',
      order: 1,
      quiz: {
        id: 'quiz-1',
        title: 'Test Quiz',
      },
      choices: [
        { id: 'choice-1', label: 'A', text: '3', correct: false },
        { id: 'choice-2', label: 'B', text: '4', correct: true },
        { id: 'choice-3', label: 'C', text: '5', correct: false },
      ],
    };

    it('should create question successfully', async () => {
      mockQuizService.createQuestion.mockResolvedValue(mockCreatedQuestion as any);

      const response = await request(app)
        .post('/api/quizzes/quiz-1/questions')
        .send(mockQuestionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedQuestion);
      expect(mockQuizService.createQuestion).toHaveBeenCalledWith(
        { ...mockQuestionData, quizId: 'quiz-1' },
        'test-user-id',
        Role.TEACHER
      );
    });

    it('should return 400 for invalid question data', async () => {
      const invalidData = {
        text: '', // Empty text
        choices: [
          { label: 'A', text: '3', correct: true },
          { label: 'B', text: '4', correct: true }, // Multiple correct answers
        ],
      };

      const response = await request(app)
        .post('/api/quizzes/quiz-1/questions')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/quizzes/:id/attempts (Student)', () => {
    beforeEach(() => {
      // Mock student user
      jest.doMock('../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = {
            id: 'student-user-id',
            role: Role.STUDENT,
          };
          next();
        },
      }));
    });

    const mockAttempt = {
      id: 'attempt-1',
      studentId: 'student-1',
      quizId: 'quiz-1',
      startedAt: new Date(),
      finishedAt: null,
      score: null,
      student: {
        user: {
          id: 'student-user-id',
          name: 'Test Student',
          email: 'student@test.com',
        },
      },
      quiz: {
        id: 'quiz-1',
        title: 'Test Quiz',
        duration: 3600,
      },
      responses: [],
    };

    it('should start quiz attempt successfully', async () => {
      mockQuizService.getStudentProfileByUserId.mockResolvedValue({ id: 'student-1' });
      mockQuizService.startQuizAttempt.mockResolvedValue(mockAttempt as any);

      const response = await request(app)
        .post('/api/quizzes/quiz-1/attempts')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAttempt);
      expect(mockQuizService.startQuizAttempt).toHaveBeenCalledWith({
        quizId: 'quiz-1',
        studentId: 'student-1',
      });
    });

    it('should return 404 when student profile not found', async () => {
      mockQuizService.getStudentProfileByUserId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/quizzes/quiz-1/attempts')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('POST /api/quizzes/attempts/:id/submit (Student)', () => {
    beforeEach(() => {
      // Mock student user
      jest.doMock('../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = {
            id: 'student-user-id',
            role: Role.STUDENT,
          };
          next();
        },
      }));
    });

    const mockSubmitData = {
      responses: [
        { questionId: 'question-1', choiceId: 'choice-2' },
        { questionId: 'question-2', choiceId: 'choice-4' },
      ],
    };

    const mockQuizResult = {
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      quizTitle: 'Test Quiz',
      studentId: 'student-1',
      score: 75,
      totalQuestions: 2,
      correctAnswers: 1,
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 1800,
      responses: [
        {
          questionId: 'question-1',
          questionText: 'What is 2 + 2?',
          selectedChoiceId: 'choice-2',
          selectedChoiceText: '4',
          correctChoiceId: 'choice-2',
          correctChoiceText: '4',
          isCorrect: true,
        },
        {
          questionId: 'question-2',
          questionText: 'What is 3 + 3?',
          selectedChoiceId: 'choice-4',
          selectedChoiceText: '5',
          correctChoiceId: 'choice-3',
          correctChoiceText: '6',
          isCorrect: false,
        },
      ],
    };

    it('should submit quiz attempt successfully', async () => {
      mockQuizService.submitQuizAttempt.mockResolvedValue(mockQuizResult as any);

      const response = await request(app)
        .post('/api/quizzes/attempts/attempt-1/submit')
        .send(mockSubmitData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuizResult);
      expect(mockQuizService.submitQuizAttempt).toHaveBeenCalledWith({
        attemptId: 'attempt-1',
        responses: mockSubmitData.responses,
      });
    });

    it('should return 400 for invalid submission data', async () => {
      const invalidData = {
        responses: [], // Empty responses
      };

      const response = await request(app)
        .post('/api/quizzes/attempts/attempt-1/submit')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/quizzes/attempts/:id/result', () => {
    const mockQuizResult = {
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      quizTitle: 'Test Quiz',
      studentId: 'student-1',
      score: 85,
      totalQuestions: 5,
      correctAnswers: 4,
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 1200,
      responses: [],
    };

    it('should get quiz result successfully', async () => {
      mockQuizService.getQuizResult.mockResolvedValue(mockQuizResult as any);

      const response = await request(app)
        .get('/api/quizzes/attempts/attempt-1/result')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuizResult);
      expect(mockQuizService.getQuizResult).toHaveBeenCalledWith(
        'attempt-1',
        'test-user-id',
        Role.TEACHER
      );
    });

    it('should return 404 when attempt not found', async () => {
      mockQuizService.getQuizResult.mockRejectedValue(new Error('Attempt not found'));

      const response = await request(app)
        .get('/api/quizzes/attempts/nonexistent-attempt/result')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GET_RESULT_FAILED');
    });
  });

  describe('GET /api/quizzes/:id/progress (Student)', () => {
    beforeEach(() => {
      // Mock student user
      jest.doMock('../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = {
            id: 'student-user-id',
            role: Role.STUDENT,
          };
          next();
        },
      }));
    });

    const mockProgress = {
      studentId: 'student-1',
      quizId: 'quiz-1',
      quizTitle: 'Test Quiz',
      attemptsUsed: 2,
      attemptsAllowed: 3,
      bestScore: 85,
      lastAttemptDate: new Date(),
      canTakeQuiz: true,
      attempts: [
        {
          id: 'attempt-1',
          score: 85,
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'completed' as const,
        },
        {
          id: 'attempt-2',
          score: 70,
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'completed' as const,
        },
      ],
    };

    it('should get student quiz progress successfully', async () => {
      mockQuizService.getStudentProfileByUserId.mockResolvedValue({ id: 'student-1' });
      mockQuizService.getStudentQuizProgress.mockResolvedValue(mockProgress as any);

      const response = await request(app)
        .get('/api/quizzes/quiz-1/progress')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProgress);
      expect(mockQuizService.getStudentQuizProgress).toHaveBeenCalledWith(
        'quiz-1',
        'student-1'
      );
    });
  });

  describe('GET /api/quizzes/:id/can-take (Student)', () => {
    beforeEach(() => {
      // Mock student user
      jest.doMock('../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = {
            id: 'student-user-id',
            role: Role.STUDENT,
          };
          next();
        },
      }));
    });

    it('should check if student can take quiz successfully', async () => {
      mockQuizService.getStudentProfileByUserId.mockResolvedValue({ id: 'student-1' });
      mockQuizService.canStudentTakeQuiz.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/quizzes/quiz-1/can-take')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canTake).toBe(true);
      expect(mockQuizService.canStudentTakeQuiz).toHaveBeenCalledWith(
        'quiz-1',
        'student-1'
      );
    });

    it('should return false when student cannot take quiz', async () => {
      mockQuizService.getStudentProfileByUserId.mockResolvedValue({ id: 'student-1' });
      mockQuizService.canStudentTakeQuiz.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/quizzes/quiz-1/can-take')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canTake).toBe(false);
    });
  });
});