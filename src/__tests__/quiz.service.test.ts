import { QuizService } from "../services/quiz.service";
import { prisma } from "../config/database";
import { Role } from "@prisma/client";
import {
  CreateQuizRequest,
  UpdateQuizRequest,
  CreateQuestionRequest,
  StartQuizAttemptRequest,
  SubmitQuizAttemptRequest,
} from "../types/quiz.types";

// Mock Prisma
jest.mock("../config/database", () => ({
  prisma: {
    quiz: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    question: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    choice: {
      createMany: jest.fn(),
      update: jest.fn(),
    },
    attempt: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    response: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
    },
    enrollment: {
      count: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback({
        response: {
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        attempt: {
          update: jest.fn(),
        },
      });
    }),
  },
}));

describe("QuizService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createQuiz", () => {
    const mockCreateQuizRequest: CreateQuizRequest = {
      title: "Test Quiz",
      courseId: "course-1",
      duration: 3600,
      attemptsAllowed: 2,
    };

    const mockCourse = {
      id: "course-1",
      title: "Test Course",
      teacher: {
        user: {
          id: "teacher-1",
        },
      },
    };

    const mockCreatedQuiz = {
      id: "quiz-1",
      title: "Test Quiz",
      courseId: "course-1",
      duration: 3600,
      attemptsAllowed: 2,
      createdAt: new Date(),
      course: {
        id: "course-1",
        title: "Test Course",
      },
      questions: [],
      attempts: [],
      _count: {
        questions: 0,
        attempts: 0,
      },
    };

    it("should create quiz successfully for admin", async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.quiz.create as jest.Mock).mockResolvedValue(mockCreatedQuiz);

      const result = await QuizService.createQuiz(
        mockCreateQuizRequest,
        "admin-1",
        Role.ADMIN
      );

      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: "course-1" },
        include: {
          teacher: {
            include: {
              user: true,
            },
          },
        },
      });

      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: {
          title: "Test Quiz",
          courseId: "course-1",
          duration: 3600,
          attemptsAllowed: 2,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCreatedQuiz);
    });

    it("should create quiz successfully for assigned teacher", async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(mockCourse);
      (prisma.quiz.create as jest.Mock).mockResolvedValue(mockCreatedQuiz);

      const result = await QuizService.createQuiz(
        mockCreateQuizRequest,
        "teacher-1",
        Role.TEACHER
      );

      expect(result).toEqual(mockCreatedQuiz);
    });

    it("should throw error if course not found", async () => {
      (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        QuizService.createQuiz(mockCreateQuizRequest, "admin-1", Role.ADMIN)
      ).rejects.toThrow("Course not found");
    });

    it("should throw error if teacher not assigned to course", async () => {
      const courseWithDifferentTeacher = {
        ...mockCourse,
        teacher: {
          user: {
            id: "different-teacher",
          },
        },
      };

      (prisma.course.findUnique as jest.Mock).mockResolvedValue(
        courseWithDifferentTeacher
      );

      await expect(
        QuizService.createQuiz(mockCreateQuizRequest, "teacher-1", Role.TEACHER)
      ).rejects.toThrow(
        "Insufficient permissions to create quiz in this course"
      );
    });
  });

  describe("createQuestion", () => {
    const mockCreateQuestionRequest: CreateQuestionRequest = {
      quizId: "quiz-1",
      text: "What is 2 + 2?",
      choices: [
        { label: "A", text: "3", correct: false },
        { label: "B", text: "4", correct: true },
        { label: "C", text: "5", correct: false },
      ],
    };

    const mockQuiz = {
      id: "quiz-1",
      course: {
        teacher: {
          user: {
            id: "teacher-1",
          },
        },
      },
    };

    const mockCreatedQuestion = {
      id: "question-1",
      text: "What is 2 + 2?",
      quizId: "quiz-1",
      order: 1,
    };

    const mockQuestionWithDetails = {
      ...mockCreatedQuestion,
      quiz: {
        id: "quiz-1",
        title: "Test Quiz",
      },
      choices: [
        { id: "choice-1", label: "A", text: "3", correct: false },
        { id: "choice-2", label: "B", text: "4", correct: true },
        { id: "choice-3", label: "C", text: "5", correct: false },
      ],
    };

    it("should create question with choices successfully", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.question.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback({
            question: {
              create: jest.fn().mockResolvedValue(mockCreatedQuestion),
            },
            choice: {
              createMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          });
        }
      );
      (prisma.question.findUnique as jest.Mock).mockResolvedValue(
        mockQuestionWithDetails
      );

      const result = await QuizService.createQuestion(
        mockCreateQuestionRequest,
        "teacher-1",
        Role.TEACHER
      );

      expect(result).toEqual(mockQuestionWithDetails);
    });

    it("should throw error for invalid choices (no correct answer)", async () => {
      const invalidRequest = {
        ...mockCreateQuestionRequest,
        choices: [
          { label: "A", text: "3", correct: false },
          { label: "B", text: "4", correct: false },
        ],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);

      await expect(
        QuizService.createQuestion(invalidRequest, "teacher-1", Role.TEACHER)
      ).rejects.toThrow(
        "Invalid choices: Exactly one choice must be marked as correct"
      );
    });

    it("should throw error for invalid choices (multiple correct answers)", async () => {
      const invalidRequest = {
        ...mockCreateQuestionRequest,
        choices: [
          { label: "A", text: "3", correct: true },
          { label: "B", text: "4", correct: true },
        ],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);

      await expect(
        QuizService.createQuestion(invalidRequest, "teacher-1", Role.TEACHER)
      ).rejects.toThrow(
        "Invalid choices: Exactly one choice must be marked as correct"
      );
    });

    it("should throw error for insufficient choices", async () => {
      const invalidRequest = {
        ...mockCreateQuestionRequest,
        choices: [{ label: "A", text: "3", correct: true }],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);

      await expect(
        QuizService.createQuestion(invalidRequest, "teacher-1", Role.TEACHER)
      ).rejects.toThrow("Invalid choices: At least 2 choices are required");
    });
  });

  describe("startQuizAttempt", () => {
    const mockStartAttemptRequest: StartQuizAttemptRequest = {
      quizId: "quiz-1",
      studentId: "student-1",
    };

    const mockQuiz = {
      id: "quiz-1",
      attemptsAllowed: 2,
      questions: [
        {
          id: "question-1",
          choices: [
            { id: "choice-1", correct: false },
            { id: "choice-2", correct: true },
          ],
        },
      ],
    };

    const mockStudent = {
      id: "student-1",
      enrollments: [{ courseId: "course-1" }],
    };

    const mockCreatedAttempt = {
      id: "attempt-1",
      studentId: "student-1",
      quizId: "quiz-1",
      startedAt: new Date(),
      finishedAt: null,
      score: null,
      student: {
        user: {
          id: "user-1",
          name: "Test Student",
          email: "student@test.com",
        },
      },
      quiz: {
        id: "quiz-1",
        title: "Test Quiz",
        duration: 3600,
      },
      responses: [],
    };

    it("should start quiz attempt successfully", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.attempt.count as jest.Mock).mockResolvedValue(0);
      (prisma.attempt.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.attempt.create as jest.Mock).mockResolvedValue(
        mockCreatedAttempt
      );

      const result = await QuizService.startQuizAttempt(
        mockStartAttemptRequest
      );

      expect(result).toEqual(mockCreatedAttempt);
    });

    it("should throw error if quiz not found", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        QuizService.startQuizAttempt(mockStartAttemptRequest)
      ).rejects.toThrow("Quiz not found");
    });

    it("should throw error if student not enrolled", async () => {
      const studentNotEnrolled = {
        ...mockStudent,
        enrollments: [],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(
        studentNotEnrolled
      );

      await expect(
        QuizService.startQuizAttempt(mockStartAttemptRequest)
      ).rejects.toThrow("Student is not enrolled in the course");
    });

    it("should throw error if maximum attempts reached", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.attempt.count as jest.Mock).mockResolvedValue(2); // Max attempts reached

      await expect(
        QuizService.startQuizAttempt(mockStartAttemptRequest)
      ).rejects.toThrow("Maximum attempts reached for this quiz");
    });

    it("should throw error if active attempt exists", async () => {
      const activeAttempt = {
        id: "active-attempt",
        finishedAt: null,
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.attempt.count as jest.Mock).mockResolvedValue(0);
      (prisma.attempt.findFirst as jest.Mock).mockResolvedValue(activeAttempt);

      await expect(
        QuizService.startQuizAttempt(mockStartAttemptRequest)
      ).rejects.toThrow("You already have an active attempt for this quiz");
    });
  });

  describe("submitQuizAttempt", () => {
    const mockSubmitRequest: SubmitQuizAttemptRequest = {
      attemptId: "attempt-1",
      responses: [
        { questionId: "question-1", choiceId: "choice-2" },
        { questionId: "question-2", choiceId: "choice-4" },
      ],
    };

    const mockAttempt = {
      id: "attempt-1",
      studentId: "student-1",
      startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
      finishedAt: null,
      student: {
        user: {
          id: "user-1",
          name: "Test Student",
          email: "student@test.com",
        },
      },
      quiz: {
        id: "quiz-1",
        title: "Test Quiz",
        duration: 3600, // 1 hour
        questions: [
          {
            id: "question-1",
            text: "Question 1",
            choices: [
              { id: "choice-1", correct: false },
              { id: "choice-2", correct: true },
            ],
          },
          {
            id: "question-2",
            text: "Question 2",
            choices: [
              { id: "choice-3", correct: true },
              { id: "choice-4", correct: false },
            ],
          },
        ],
      },
      responses: [],
    };

    it("should submit quiz attempt successfully", async () => {
      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      const mockFinishedAttempt = {
        ...mockAttempt,
        score: 50, // 1 out of 2 correct
        finishedAt: new Date(),
        responses: [
          {
            questionId: "question-1",
            choiceId: "choice-2",
            question: mockAttempt.quiz.questions[0],
            choice: { id: "choice-2", text: "Correct Answer", correct: true },
          },
          {
            questionId: "question-2",
            choiceId: "choice-4",
            question: mockAttempt.quiz.questions[1],
            choice: { id: "choice-4", text: "Wrong Answer", correct: false },
          },
        ],
      };

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback({
            response: {
              createMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            attempt: {
              update: jest.fn().mockResolvedValue(mockFinishedAttempt),
            },
          });
        }
      );

      const result = await QuizService.submitQuizAttempt(mockSubmitRequest);

      expect(result.score).toBe(50);
      expect(result.correctAnswers).toBe(1);
      expect(result.totalQuestions).toBe(2);
    });

    it("should throw error if attempt not found", async () => {
      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        QuizService.submitQuizAttempt(mockSubmitRequest)
      ).rejects.toThrow("Attempt not found");
    });

    it("should throw error if attempt already submitted", async () => {
      const finishedAttempt = {
        ...mockAttempt,
        finishedAt: new Date(),
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(
        finishedAttempt
      );

      await expect(
        QuizService.submitQuizAttempt(mockSubmitRequest)
      ).rejects.toThrow("Attempt already submitted");
    });

    it("should throw error if time limit exceeded", async () => {
      const expiredAttempt = {
        ...mockAttempt,
        startedAt: new Date(Date.now() - 7200000), // 2 hours ago
        quiz: {
          ...mockAttempt.quiz,
          duration: 3600, // 1 hour limit
        },
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(
        expiredAttempt
      );

      // Should auto-submit expired attempt instead of throwing error
      const result = await QuizService.submitQuizAttempt(mockSubmitRequest);
      expect(result.score).toBe(0); // Should get 0 score for expired attempt
    });

    it("should throw error if not all questions answered", async () => {
      const incompleteRequest = {
        attemptId: "attempt-1",
        responses: [
          { questionId: "question-1", choiceId: "choice-2" },
          // Missing question-2
        ],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      await expect(
        QuizService.submitQuizAttempt(incompleteRequest)
      ).rejects.toThrow("Invalid quiz submission");
    });

    it("should throw error for invalid choice ID", async () => {
      const invalidRequest = {
        attemptId: "attempt-1",
        responses: [
          { questionId: "question-1", choiceId: "invalid-choice" },
          { questionId: "question-2", choiceId: "choice-4" },
        ],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      await expect(
        QuizService.submitQuizAttempt(invalidRequest)
      ).rejects.toThrow(
        "Invalid choice ID: invalid-choice for question: question-1"
      );
    });
  });

  describe("getStudentQuizProgress", () => {
    const mockQuiz = {
      id: "quiz-1",
      title: "Test Quiz",
      attemptsAllowed: 3,
    };

    const mockAttempts = [
      {
        id: "attempt-1",
        score: 85,
        startedAt: new Date("2024-01-02"),
        finishedAt: new Date("2024-01-02"),
      },
      {
        id: "attempt-2",
        score: 70,
        startedAt: new Date("2024-01-01"),
        finishedAt: new Date("2024-01-01"),
      },
    ];

    it("should get student quiz progress successfully", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.attempt.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await QuizService.getStudentQuizProgress(
        "quiz-1",
        "student-1"
      );

      expect(result.quizId).toBe("quiz-1");
      expect(result.quizTitle).toBe("Test Quiz");
      expect(result.attemptsUsed).toBe(2);
      expect(result.attemptsAllowed).toBe(3);
      expect(result.canTakeQuiz).toBe(true);
      expect(result.bestScore).toBe(85);
      expect(result.attempts).toHaveLength(2);
    });

    it("should return correct progress when max attempts reached", async () => {
      const maxAttempts = [
        ...mockAttempts,
        {
          id: "attempt-3",
          score: 90,
          startedAt: new Date("2024-01-03"),
          finishedAt: new Date("2024-01-03"),
        },
      ];

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.attempt.findMany as jest.Mock).mockResolvedValue(maxAttempts);

      const result = await QuizService.getStudentQuizProgress(
        "quiz-1",
        "student-1"
      );

      expect(result.attemptsUsed).toBe(3);
      expect(result.canTakeQuiz).toBe(false);
      expect(result.bestScore).toBe(90);
    });

    it("should throw error if quiz not found", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        QuizService.getStudentQuizProgress("quiz-1", "student-1")
      ).rejects.toThrow("Quiz not found");
    });
  });

  describe("canStudentTakeQuiz", () => {
    it("should return true if student can take quiz", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        attemptsAllowed: 3,
      });
      (prisma.attempt.count as jest.Mock).mockResolvedValue(1);

      const result = await QuizService.canStudentTakeQuiz(
        "quiz-1",
        "student-1"
      );

      expect(result).toBe(true);
    });

    it("should return false if max attempts reached", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        attemptsAllowed: 2,
      });
      (prisma.attempt.count as jest.Mock).mockResolvedValue(2);

      const result = await QuizService.canStudentTakeQuiz(
        "quiz-1",
        "student-1"
      );

      expect(result).toBe(false);
    });

    it("should return false if quiz not found", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await QuizService.canStudentTakeQuiz(
        "quiz-1",
        "student-1"
      );

      expect(result).toBe(false);
    });
  });
});

// Security and validation tests
describe("Quiz Security and Validation", () => {
  describe("Quiz Attempt Security", () => {
    it("should prevent starting quiz with no questions", async () => {
      const mockQuiz = {
        id: "quiz-1",
        questions: [], // No questions
        course: { id: "course-1", title: "Test Course" },
      };

      const mockStudent = {
        id: "student-1",
        enrollments: [{ course: { quizzes: [{ id: "quiz-1" }] } }],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);

      const startAttemptData: StartQuizAttemptRequest = {
        quizId: "quiz-1",
        studentId: "student-1",
      };

      await expect(
        QuizService.startQuizAttempt(startAttemptData)
      ).rejects.toThrow("Quiz has no questions and cannot be started");
    });

    it("should prevent starting quiz with invalid question configuration", async () => {
      const mockQuiz = {
        id: "quiz-1",
        questions: [
          {
            id: "question-1",
            choices: [
              { id: "choice-1", correct: true },
              { id: "choice-2", correct: true }, // Two correct answers - invalid
            ],
          },
        ],
        course: { id: "course-1", title: "Test Course" },
      };

      const mockStudent = {
        id: "student-1",
        enrollments: [{ course: { quizzes: [{ id: "quiz-1" }] } }],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);

      const startAttemptData: StartQuizAttemptRequest = {
        quizId: "quiz-1",
        studentId: "student-1",
      };

      await expect(
        QuizService.startQuizAttempt(startAttemptData)
      ).rejects.toThrow(
        "Quiz contains questions with invalid answer configuration"
      );
    });

    it("should enforce attempt limits", async () => {
      const mockQuiz = {
        id: "quiz-1",
        attemptsAllowed: 2,
        questions: [
          {
            id: "question-1",
            choices: [
              { id: "choice-1", correct: true },
              { id: "choice-2", correct: false },
            ],
          },
        ],
        course: { id: "course-1", title: "Test Course" },
      };

      const mockStudent = {
        id: "student-1",
        enrollments: [{ course: { quizzes: [{ id: "quiz-1" }] } }],
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.attempt.count as jest.Mock).mockResolvedValue(2); // Already at limit

      const startAttemptData: StartQuizAttemptRequest = {
        quizId: "quiz-1",
        studentId: "student-1",
      };

      await expect(
        QuizService.startQuizAttempt(startAttemptData)
      ).rejects.toThrow("Maximum attempts reached for this quiz");
    });

    it("should prevent concurrent attempts", async () => {
      const mockQuiz = {
        id: "quiz-1",
        attemptsAllowed: 3,
        questions: [
          {
            id: "question-1",
            choices: [
              { id: "choice-1", correct: true },
              { id: "choice-2", correct: false },
            ],
          },
        ],
        course: { id: "course-1", title: "Test Course" },
      };

      const mockStudent = {
        id: "student-1",
        enrollments: [{ course: { quizzes: [{ id: "quiz-1" }] } }],
      };

      const mockActiveAttempt = {
        id: "attempt-1",
        startedAt: new Date(),
        finishedAt: null, // Active attempt
      };

      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.attempt.count as jest.Mock).mockResolvedValue(1);
      (prisma.attempt.findFirst as jest.Mock).mockResolvedValue(
        mockActiveAttempt
      );

      const startAttemptData: StartQuizAttemptRequest = {
        quizId: "quiz-1",
        studentId: "student-1",
      };

      await expect(
        QuizService.startQuizAttempt(startAttemptData)
      ).rejects.toThrow("You already have an active attempt for this quiz");
    });
  });

  describe("Quiz Submission Security", () => {
    it("should validate all responses are provided", async () => {
      const mockAttempt = {
        id: "attempt-1",
        startedAt: new Date(),
        finishedAt: null,
        quiz: {
          id: "quiz-1",
          duration: 3600,
          questions: [
            { id: "question-1", choices: [{ id: "choice-1", correct: true }] },
            { id: "question-2", choices: [{ id: "choice-2", correct: false }] },
          ],
        },
        responses: [],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      const submitData: SubmitQuizAttemptRequest = {
        attemptId: "attempt-1",
        responses: [
          { questionId: "question-1", choiceId: "choice-1" },
          // Missing question-2 response
        ],
      };

      await expect(QuizService.submitQuizAttempt(submitData)).rejects.toThrow(
        "Invalid quiz submission"
      );
    });

    it("should prevent duplicate responses", async () => {
      const mockAttempt = {
        id: "attempt-1",
        startedAt: new Date(),
        finishedAt: null,
        quiz: {
          id: "quiz-1",
          duration: 3600,
          questions: [
            { id: "question-1", choices: [{ id: "choice-1", correct: true }] },
          ],
        },
        responses: [],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      const submitData: SubmitQuizAttemptRequest = {
        attemptId: "attempt-1",
        responses: [
          { questionId: "question-1", choiceId: "choice-1" },
          { questionId: "question-1", choiceId: "choice-1" }, // Duplicate
        ],
      };

      await expect(QuizService.submitQuizAttempt(submitData)).rejects.toThrow(
        "Invalid quiz submission"
      );
    });

    it("should enforce time limits", async () => {
      const pastTime = new Date(Date.now() - 4000 * 1000); // 4000 seconds ago
      const mockAttempt = {
        id: "attempt-1",
        startedAt: pastTime,
        finishedAt: null,
        quiz: {
          id: "quiz-1",
          duration: 3600, // 1 hour limit
          questions: [
            { id: "question-1", choices: [{ id: "choice-1", correct: true }] },
          ],
        },
        responses: [],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      const submitData: SubmitQuizAttemptRequest = {
        attemptId: "attempt-1",
        responses: [{ questionId: "question-1", choiceId: "choice-1" }],
      };

      // Should auto-submit expired attempt instead of throwing error
      const mockAutoSubmitResult = {
        attemptId: "attempt-1",
        score: 0,
        // ... other result properties
      };

      // Mock the auto-submit functionality
      (prisma.response.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attempt.update as jest.Mock).mockResolvedValue({
        id: "attempt-1",
        score: 0,
        startedAt: pastTime,
        finishedAt: new Date(),
        quiz: { id: "quiz-1", title: "Test Quiz", duration: 3600 },
        responses: [],
      });

      const result = await QuizService.submitQuizAttempt(submitData);
      expect(result.score).toBe(0); // Should get 0 score for expired attempt
    });

    it("should validate choice IDs belong to questions", async () => {
      const mockAttempt = {
        id: "attempt-1",
        startedAt: new Date(),
        finishedAt: null,
        quiz: {
          id: "quiz-1",
          duration: 3600,
          questions: [
            {
              id: "question-1",
              choices: [
                { id: "choice-1", correct: true },
                { id: "choice-2", correct: false },
              ],
            },
          ],
        },
        responses: [],
      };

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);

      const submitData: SubmitQuizAttemptRequest = {
        attemptId: "attempt-1",
        responses: [
          { questionId: "question-1", choiceId: "invalid-choice-id" },
        ],
      };

      await expect(QuizService.submitQuizAttempt(submitData)).rejects.toThrow(
        "Invalid quiz submission"
      );
    });

    it("should detect suspicious fast completion", async () => {
      const recentTime = new Date(Date.now() - 10 * 1000); // 10 seconds ago
      const mockAttempt = {
        id: "attempt-1",
        startedAt: recentTime,
        finishedAt: null,
        quiz: {
          id: "quiz-1",
          duration: 3600,
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: `question-${i + 1}`,
            choices: [
              { id: `choice-${i + 1}-1`, correct: true, label: "A" },
              { id: `choice-${i + 1}-2`, correct: false, label: "B" },
            ],
          })),
        },
        responses: [],
      };

      const responses = Array.from({ length: 10 }, (_, i) => ({
        questionId: `question-${i + 1}`,
        choiceId: `choice-${i + 1}-1`,
      }));

      (prisma.attempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback({
            response: {
              createMany: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
            attempt: {
              update: jest.fn().mockResolvedValue({
                id: "attempt-1",
                score: 100,
                startedAt: recentTime,
                finishedAt: new Date(),
                quiz: { id: "quiz-1", title: "Test Quiz", duration: 3600 },
                responses: responses.map((r, i) => ({
                  questionId: r.questionId,
                  choiceId: r.choiceId,
                  question: mockAttempt.quiz.questions[i],
                  choice: mockAttempt.quiz.questions[i].choices[0],
                })),
              }),
            },
          });
        }
      );

      const submitData: SubmitQuizAttemptRequest = {
        attemptId: "attempt-1",
        responses,
      };

      // Should still process but log suspicious activity
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await QuizService.submitQuizAttempt(submitData);

      expect(result.score).toBe(100);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Suspicious activity detected"),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Anti-Cheating Measures", () => {
    it("should detect all same answer pattern", async () => {
      const responses = Array.from({ length: 5 }, (_, i) => ({
        questionId: `question-${i + 1}`,
        choiceId: `choice-${i + 1}-1`, // All A answers
      }));

      const questions = Array.from({ length: 5 }, (_, i) => ({
        id: `question-${i + 1}`,
        choices: [
          { id: `choice-${i + 1}-1`, correct: false, label: "A" },
          { id: `choice-${i + 1}-2`, correct: true, label: "B" },
        ],
      }));

      const mockAttempt = {
        quiz: { questions },
        startedAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      // Test the suspicious activity detection
      const suspiciousActivity = (QuizService as any).detectSuspiciousActivity(
        mockAttempt,
        responses
      );

      expect(suspiciousActivity.isSuspicious).toBe(true);
      expect(suspiciousActivity.reasons).toContainEqual(
        expect.stringContaining("All answers are the same choice: A")
      );
    });

    it("should detect sequential answer pattern", async () => {
      const responses = [
        { questionId: "question-1", choiceId: "choice-1-1" }, // A
        { questionId: "question-2", choiceId: "choice-2-2" }, // B
        { questionId: "question-3", choiceId: "choice-3-3" }, // C
        { questionId: "question-4", choiceId: "choice-4-4" }, // D
        { questionId: "question-5", choiceId: "choice-5-5" }, // E
      ];

      const questions = Array.from({ length: 5 }, (_, i) => ({
        id: `question-${i + 1}`,
        choices: [
          { id: `choice-${i + 1}-1`, correct: false, label: "A" },
          { id: `choice-${i + 1}-2`, correct: false, label: "B" },
          { id: `choice-${i + 1}-3`, correct: false, label: "C" },
          { id: `choice-${i + 1}-4`, correct: false, label: "D" },
          { id: `choice-${i + 1}-5`, correct: true, label: "E" },
        ],
      }));

      const mockAttempt = {
        quiz: { questions },
        startedAt: new Date(Date.now() - 60 * 1000),
      };

      const suspiciousActivity = (QuizService as any).detectSuspiciousActivity(
        mockAttempt,
        responses
      );

      expect(suspiciousActivity.isSuspicious).toBe(true);
      expect(suspiciousActivity.reasons).toContain(
        "Sequential answer pattern detected"
      );
    });
  });
});
