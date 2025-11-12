import { prisma } from '../config/database';
import { Role } from '@prisma/client';
import {
  CreateQuizRequest,
  UpdateQuizRequest,
  QuizWithDetails,
  QuizListItem,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionWithDetails,
  CreateChoiceRequest,
  UpdateChoiceRequest,
  StartQuizAttemptRequest,
  SubmitQuizAttemptRequest,
  AttemptWithDetails,
  QuizResult,
  QuizStatistics,
  StudentQuizProgress,
  QuizSearchQuery,
  QuizValidationResult
} from '../types/quiz.types';
import { PaginatedResponse } from '../types/api.types';

export class QuizService {
  /**
   * Create a new quiz (Admin or assigned teacher)
   */
  static async createQuiz(data: CreateQuizRequest, userId: string, userRole: Role): Promise<QuizWithDetails> {
    try {
      // Check course permissions
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
        include: {
          teacher: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to create quiz in this course');
      }

      const quiz = await prisma.quiz.create({
        data: {
          title: data.title.trim(),
          courseId: data.courseId,
          duration: data.duration,
          attemptsAllowed: data.attemptsAllowed || 1,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          questions: {
            include: {
              choices: true,
            },
            orderBy: { order: 'asc' },
          },
          attempts: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
      });

      return quiz as QuizWithDetails;
    } catch (error) {
      console.error('Create quiz error:', error);
      throw error;
    }
  }

  /**
   * Get quiz by ID with full details
   */
  static async getQuizById(quizId: string, userId?: string, userRole?: Role): Promise<QuizWithDetails> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          questions: {
            include: {
              choices: true,
            },
            orderBy: { order: 'asc' },
          },
          attempts: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // If user is a student, hide correct answers
      if (userRole === Role.STUDENT) {
        quiz.questions = quiz.questions.map(question => ({
          ...question,
          choices: question.choices.map(choice => ({
            ...choice,
            correct: false, // Hide correct answers from students
          })),
        }));
      }

      return quiz as QuizWithDetails;
    } catch (error) {
      console.error('Get quiz by ID error:', error);
      throw error;
    }
  }

  /**
   * Get all quizzes with pagination and filtering
   */
  static async getAllQuizzes(query: QuizSearchQuery): Promise<PaginatedResponse<QuizListItem>> {
    try {
      const { courseId, search, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (courseId) {
        where.courseId = courseId;
      }

      if (search) {
        where.title = { contains: search, mode: 'insensitive' };
      }

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where,
          select: {
            id: true,
            title: true,
            courseId: true,
            duration: true,
            attemptsAllowed: true,
            createdAt: true,
            course: {
              select: {
                title: true,
              },
            },
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.quiz.count({ where }),
      ]);

      const items: QuizListItem[] = quizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        courseId: quiz.courseId,
        courseName: quiz.course.title,
        duration: quiz.duration,
        attemptsAllowed: quiz.attemptsAllowed,
        createdAt: quiz.createdAt,
        questionCount: quiz._count.questions,
        attemptCount: quiz._count.attempts,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Get all quizzes error:', error);
      throw error;
    }
  }

  /**
   * Update quiz (Admin or assigned teacher)
   */
  static async updateQuiz(quizId: string, data: UpdateQuizRequest, userId: string, userRole: Role): Promise<QuizWithDetails> {
    try {
      // Check quiz and course permissions
      const existingQuiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          course: {
            include: {
              teacher: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && existingQuiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to update this quiz');
      }

      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          ...(data.title && { title: data.title.trim() }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.attemptsAllowed !== undefined && { attemptsAllowed: data.attemptsAllowed }),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          questions: {
            include: {
              choices: true,
            },
            orderBy: { order: 'asc' },
          },
          attempts: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
      });

      return updatedQuiz as QuizWithDetails;
    } catch (error) {
      console.error('Update quiz error:', error);
      throw error;
    }
  }

  /**
   * Delete quiz (Admin or assigned teacher)
   */
  static async deleteQuiz(quizId: string, userId: string, userRole: Role): Promise<void> {
    try {
      // Check quiz and course permissions
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          course: {
            include: {
              teacher: {
                include: {
                  user: true,
                },
              },
            },
          },
          attempts: true,
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && quiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to delete this quiz');
      }

      // Check if quiz has attempts
      if (quiz.attempts.length > 0) {
        throw new Error('Cannot delete quiz with existing attempts');
      }

      await prisma.quiz.delete({
        where: { id: quizId },
      });
    } catch (error) {
      console.error('Delete quiz error:', error);
      throw error;
    }
  }

  // Question Management Methods

  /**
   * Create question in quiz
   */
  static async createQuestion(data: CreateQuestionRequest, userId: string, userRole: Role): Promise<QuestionWithDetails> {
    try {
      // Check quiz and course permissions
      const quiz = await prisma.quiz.findUnique({
        where: { id: data.quizId },
        include: {
          course: {
            include: {
              teacher: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && quiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to create question in this quiz');
      }

      // Validate choices
      const validationResult = this.validateQuestionChoices(data.choices);
      if (!validationResult.isValid) {
        throw new Error(`Invalid choices: ${validationResult.errors.join(', ')}`);
      }

      // Get next order number
      const lastQuestion = await prisma.question.findFirst({
        where: { quizId: data.quizId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const nextOrder = data.order ?? (lastQuestion ? lastQuestion.order + 1 : 1);

      // Create question with choices in a transaction
      const question = await prisma.$transaction(async (tx) => {
        const createdQuestion = await tx.question.create({
          data: {
            text: data.text.trim(),
            imageUrl: data.imageUrl?.trim(),
            order: nextOrder,
            quizId: data.quizId,
          },
        });

        // Create choices
        await tx.choice.createMany({
          data: data.choices.map(choice => ({
            questionId: createdQuestion.id,
            label: choice.label.toUpperCase(),
            text: choice.text.trim(),
            correct: choice.correct,
          })),
        });

        return createdQuestion;
      });

      // Fetch the complete question with choices
      const questionWithDetails = await prisma.question.findUnique({
        where: { id: question.id },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
          choices: true,
        },
      });

      return questionWithDetails as QuestionWithDetails;
    } catch (error) {
      console.error('Create question error:', error);
      throw error;
    }
  }

  /**
   * Update question
   */
  static async updateQuestion(questionId: string, data: UpdateQuestionRequest, userId: string, userRole: Role): Promise<QuestionWithDetails> {
    try {
      // Check question, quiz and course permissions
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          quiz: {
            include: {
              course: {
                include: {
                  teacher: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && question.quiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to update this question');
      }

      const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
          ...(data.text && { text: data.text.trim() }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() }),
          ...(data.order !== undefined && { order: data.order }),
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
          choices: true,
        },
      });

      return updatedQuestion as QuestionWithDetails;
    } catch (error) {
      console.error('Update question error:', error);
      throw error;
    }
  }

  /**
   * Delete question
   */
  static async deleteQuestion(questionId: string, userId: string, userRole: Role): Promise<void> {
    try {
      // Check question, quiz and course permissions
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          quiz: {
            include: {
              course: {
                include: {
                  teacher: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
              attempts: true,
            },
          },
          responses: true,
        },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && question.quiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to delete this question');
      }

      // Check if question has responses
      if (question.responses.length > 0) {
        throw new Error('Cannot delete question with existing responses');
      }

      await prisma.question.delete({
        where: { id: questionId },
      });
    } catch (error) {
      console.error('Delete question error:', error);
      throw error;
    }
  }

  /**
   * Update choice
   */
  static async updateChoice(choiceId: string, data: UpdateChoiceRequest, userId: string, userRole: Role): Promise<void> {
    try {
      // Check choice, question, quiz and course permissions
      const choice = await prisma.choice.findUnique({
        where: { id: choiceId },
        include: {
          question: {
            include: {
              quiz: {
                include: {
                  course: {
                    include: {
                      teacher: {
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: true,
        },
      });

      if (!choice) {
        throw new Error('Choice not found');
      }

      // Check permissions
      if (userRole !== Role.ADMIN && choice.question.quiz.course.teacher?.user.id !== userId) {
        throw new Error('Insufficient permissions to update this choice');
      }

      // Check if choice has responses
      if (choice.responses.length > 0) {
        throw new Error('Cannot update choice with existing responses');
      }

      await prisma.choice.update({
        where: { id: choiceId },
        data: {
          ...(data.label && { label: data.label.toUpperCase() }),
          ...(data.text && { text: data.text.trim() }),
          ...(data.correct !== undefined && { correct: data.correct }),
        },
      });
    } catch (error) {
      console.error('Update choice error:', error);
      throw error;
    }
  }

  // Quiz Attempt Methods

  /**
   * Start quiz attempt with enhanced security validation
   */
  static async startQuizAttempt(data: StartQuizAttemptRequest): Promise<AttemptWithDetails> {
    try {
      const { quizId, studentId } = data;

      // Check if quiz exists and has questions
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            include: {
              choices: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Validate quiz has questions
      if (quiz.questions.length === 0) {
        throw new Error('Quiz has no questions and cannot be started');
      }

      // Validate all questions have at least 2 choices and exactly 1 correct answer
      for (const question of quiz.questions) {
        if (question.choices.length < 2) {
          throw new Error('Quiz contains questions with insufficient choices');
        }
        
        const correctChoices = question.choices.filter(choice => choice.correct);
        if (correctChoices.length !== 1) {
          throw new Error('Quiz contains questions with invalid answer configuration');
        }
      }

      // Check if student exists and is enrolled in the course
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          enrollments: {
            where: {
              course: {
                quizzes: {
                  some: {
                    id: quizId,
                  },
                },
              },
            },
          },
        },
      });

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.enrollments.length === 0) {
        throw new Error('Student is not enrolled in the course');
      }

      // Check attempt limits
      const existingAttempts = await prisma.attempt.count({
        where: {
          studentId,
          quizId,
        },
      });

      if (existingAttempts >= quiz.attemptsAllowed) {
        throw new Error('Maximum attempts reached for this quiz');
      }

      // Check for active attempt (security measure against concurrent attempts)
      const activeAttempt = await prisma.attempt.findFirst({
        where: {
          studentId,
          quizId,
          finishedAt: null,
        },
      });

      if (activeAttempt) {
        // Check if active attempt has exceeded time limit
        if (quiz.duration) {
          const timeElapsed = Math.floor((Date.now() - activeAttempt.startedAt.getTime()) / 1000);
          if (timeElapsed > quiz.duration + 60) { // 60 seconds grace period
            // Auto-submit expired attempt
            await this.autoSubmitExpiredAttempt(activeAttempt.id, quiz);
          } else {
            throw new Error('You already have an active attempt for this quiz');
          }
        } else {
          throw new Error('You already have an active attempt for this quiz');
        }
      }

      // Create new attempt
      const attempt = await prisma.attempt.create({
        data: {
          studentId,
          quizId,
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
              duration: true,
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  choices: true,
                },
              },
              choice: true,
            },
          },
        },
      });

      return attempt as AttemptWithDetails;
    } catch (error) {
      console.error('Start quiz attempt error:', error);
      throw error;
    }
  }

  /**
   * Submit quiz attempt with enhanced security validation
   */
  static async submitQuizAttempt(data: SubmitQuizAttemptRequest): Promise<QuizResult> {
    try {
      const { attemptId, responses } = data;

      // Get attempt with quiz and questions
      const attempt = await prisma.attempt.findUnique({
        where: { id: attemptId },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          quiz: {
            include: {
              questions: {
                include: {
                  choices: true,
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          responses: true,
        },
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      if (attempt.finishedAt) {
        throw new Error('Attempt already submitted');
      }

      // Enhanced time validation with strict enforcement
      if (attempt.quiz.duration) {
        const timeElapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
        const allowedTime = attempt.quiz.duration + 30; // 30 seconds grace period for network delays
        
        if (timeElapsed > allowedTime) {
          // Auto-submit with current responses if time exceeded
          return await this.autoSubmitExpiredAttempt(attemptId, attempt.quiz);
        }
      }

      // Comprehensive response validation
      const validationResult = this.validateQuizResponses(responses, attempt.quiz.questions);
      if (!validationResult.isValid) {
        throw new Error(`Invalid quiz submission: ${validationResult.errors.join(', ')}`);
      }

      // Anti-cheating measures: Check for suspicious patterns
      const suspiciousActivity = this.detectSuspiciousActivity(attempt, responses);
      if (suspiciousActivity.isSuspicious) {
        console.warn(`Suspicious activity detected for attempt ${attemptId}:`, suspiciousActivity.reasons);
        // Log suspicious activity but don't block submission
        await this.logSuspiciousActivity(attemptId, suspiciousActivity.reasons);
      }

      // Calculate score and save responses in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Check if responses already exist (prevent double submission)
        const existingResponses = await tx.response.findMany({
          where: { attemptId },
        });

        if (existingResponses.length > 0) {
          throw new Error('Responses already submitted for this attempt');
        }

        // Save responses with server-side validation
        const validatedResponses = responses.map(response => {
          const question = attempt.quiz.questions.find(q => q.id === response.questionId);
          const choice = question?.choices.find(c => c.id === response.choiceId);
          
          if (!question || !choice) {
            throw new Error(`Invalid response data: question ${response.questionId}, choice ${response.choiceId}`);
          }

          return {
            attemptId,
            questionId: response.questionId,
            choiceId: response.choiceId,
          };
        });

        await tx.response.createMany({
          data: validatedResponses,
        });

        // Server-side score calculation (never trust client-side calculations)
        let correctAnswers = 0;
        const totalQuestions = attempt.quiz.questions.length;

        for (const response of responses) {
          const question = attempt.quiz.questions.find(q => q.id === response.questionId);
          const selectedChoice = question?.choices.find(c => c.id === response.choiceId);
          
          if (selectedChoice?.correct) {
            correctAnswers++;
          }
        }

        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100 : 0;

        // Update attempt with score and finish time
        const finishedAttempt = await tx.attempt.update({
          where: { id: attemptId },
          data: {
            score,
            finishedAt: new Date(),
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            quiz: {
              select: {
                id: true,
                title: true,
                duration: true,
              },
            },
            responses: {
              include: {
                question: {
                  include: {
                    choices: true,
                  },
                },
                choice: true,
              },
            },
          },
        });

        return { finishedAttempt, correctAnswers, totalQuestions };
      });

      // Format quiz result
      const quizResult: QuizResult = {
        attemptId: result.finishedAttempt.id,
        quizId: result.finishedAttempt.quiz.id,
        quizTitle: result.finishedAttempt.quiz.title,
        studentId: result.finishedAttempt.studentId,
        score: result.finishedAttempt.score || 0,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        startedAt: result.finishedAttempt.startedAt,
        finishedAt: result.finishedAttempt.finishedAt!,
        duration: Math.floor((result.finishedAttempt.finishedAt!.getTime() - result.finishedAttempt.startedAt.getTime()) / 1000),
        responses: result.finishedAttempt.responses.map(response => {
          const correctChoice = response.question.choices.find(c => c.correct);
          return {
            questionId: response.questionId,
            questionText: response.question.text,
            selectedChoiceId: response.choiceId,
            selectedChoiceText: response.choice?.text,
            correctChoiceId: correctChoice?.id || '',
            correctChoiceText: correctChoice?.text || '',
            isCorrect: response.choice?.correct || false,
          };
        }),
      };

      return quizResult;
    } catch (error) {
      console.error('Submit quiz attempt error:', error);
      throw error;
    }
  }

  /**
   * Get quiz result by attempt ID
   */
  static async getQuizResult(attemptId: string, userId: string, userRole: Role): Promise<QuizResult> {
    try {
      const attempt = await prisma.attempt.findUnique({
        where: { id: attemptId },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          quiz: {
            include: {
              course: {
                include: {
                  teacher: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  choices: true,
                },
              },
              choice: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      if (!attempt.finishedAt) {
        throw new Error('Attempt not yet completed');
      }

      // Check permissions
      const isOwnAttempt = attempt.student.user.id === userId;
      const isTeacher = userRole === Role.TEACHER && attempt.quiz.course.teacher?.user.id === userId;
      const isAdmin = userRole === Role.ADMIN;
      
      // Check if user is parent of the student
      let isParent = false;
      if (userRole === Role.PARENT) {
        const parentProfile = await prisma.parent.findUnique({
          where: { userId },
          include: { children: true },
        });
        isParent = parentProfile?.children.some(child => child.id === attempt.studentId) || false;
      }

      if (!isOwnAttempt && !isTeacher && !isAdmin && !isParent) {
        throw new Error('Insufficient permissions to view this quiz result');
      }

      // Calculate statistics
      const totalQuestions = attempt.responses.length;
      const correctAnswers = attempt.responses.filter(r => r.choice?.correct).length;

      const quizResult: QuizResult = {
        attemptId: attempt.id,
        quizId: attempt.quiz.id,
        quizTitle: attempt.quiz.title,
        studentId: attempt.studentId,
        score: attempt.score || 0,
        totalQuestions,
        correctAnswers,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        duration: Math.floor((attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 1000),
        responses: attempt.responses.map(response => {
          const correctChoice = response.question.choices.find(c => c.correct);
          return {
            questionId: response.questionId,
            questionText: response.question.text,
            selectedChoiceId: response.choiceId,
            selectedChoiceText: response.choice?.text,
            correctChoiceId: correctChoice?.id || '',
            correctChoiceText: correctChoice?.text || '',
            isCorrect: response.choice?.correct || false,
          };
        }),
      };

      return quizResult;
    } catch (error) {
      console.error('Get quiz result error:', error);
      throw error;
    }
  }

  /**
   * Get student quiz progress
   */
  static async getStudentQuizProgress(quizId: string, studentId: string): Promise<StudentQuizProgress> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: {
          id: true,
          title: true,
          attemptsAllowed: true,
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      const attempts = await prisma.attempt.findMany({
        where: {
          quizId,
          studentId,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      const attemptsUsed = attempts.length;
      const canTakeQuiz = attemptsUsed < quiz.attemptsAllowed;
      const bestScore = attempts.length > 0 ? Math.max(...attempts.filter(a => a.score !== null).map(a => a.score!)) : undefined;
      const lastAttemptDate = attempts.length > 0 ? attempts[0].startedAt : undefined;

      const studentAttempts = attempts.map(attempt => ({
        id: attempt.id,
        score: attempt.score,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        status: attempt.finishedAt ? 'completed' as const : 'in_progress' as const,
      }));

      return {
        studentId,
        quizId,
        quizTitle: quiz.title,
        attemptsUsed,
        attemptsAllowed: quiz.attemptsAllowed,
        bestScore,
        lastAttemptDate,
        canTakeQuiz,
        attempts: studentAttempts,
      };
    } catch (error) {
      console.error('Get student quiz progress error:', error);
      throw error;
    }
  }

  /**
   * Get quiz statistics (for teachers and admins)
   */
  static async getQuizStatistics(quizId: string, userId: string, userRole: Role): Promise<QuizStatistics> {
    try {
      // Check quiz and permissions
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          course: {
            include: {
              teacher: {
                include: {
                  user: true,
                },
              },
            },
          },
          questions: {
            include: {
              choices: true,
            },
            orderBy: { order: 'asc' },
          },
          attempts: {
            where: {
              finishedAt: { not: null },
            },
            include: {
              responses: {
                include: {
                  choice: true,
                },
              },
            },
          },
        },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Check permissions
      const isTeacher = userRole === Role.TEACHER && quiz.course.teacher?.user.id === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isTeacher && !isAdmin) {
        throw new Error('Insufficient permissions to view quiz statistics');
      }

      const completedAttempts = quiz.attempts;
      const totalAttempts = completedAttempts.length;

      // Calculate overall statistics
      const scores = completedAttempts.map(a => a.score!).filter(s => s !== null);
      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Calculate completion rate (assuming total enrolled students)
      const enrolledStudents = await prisma.enrollment.count({
        where: {
          courseId: quiz.course.id,
        },
      });
      const completionRate = enrolledStudents > 0 ? (totalAttempts / enrolledStudents) * 100 : 0;

      // Calculate question statistics
      const questionStatistics = quiz.questions.map(question => {
        const questionResponses = completedAttempts.flatMap(attempt => 
          attempt.responses.filter(r => r.questionId === question.id)
        );

        const totalResponses = questionResponses.length;
        const correctResponses = questionResponses.filter(r => r.choice?.correct).length;
        const correctPercentage = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

        const choiceStatistics = question.choices.map(choice => {
          const choiceResponses = questionResponses.filter(r => r.choiceId === choice.id);
          const responseCount = choiceResponses.length;
          const responsePercentage = totalResponses > 0 ? (responseCount / totalResponses) * 100 : 0;

          return {
            choiceId: choice.id,
            choiceText: choice.text,
            choiceLabel: choice.label,
            responseCount,
            responsePercentage,
            isCorrect: choice.correct,
          };
        });

        return {
          questionId: question.id,
          questionText: question.text,
          totalResponses,
          correctResponses,
          correctPercentage,
          choiceStatistics,
        };
      });

      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        totalAttempts,
        averageScore,
        highestScore,
        lowestScore,
        completionRate,
        questionStatistics,
      };
    } catch (error) {
      console.error('Get quiz statistics error:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validate question choices
   */
  private static validateQuestionChoices(choices: CreateChoiceRequest[]): QuizValidationResult {
    const errors: string[] = [];

    if (choices.length < 2) {
      errors.push('At least 2 choices are required');
    }

    if (choices.length > 5) {
      errors.push('Maximum 5 choices allowed');
    }

    const correctChoices = choices.filter(c => c.correct);
    if (correctChoices.length !== 1) {
      errors.push('Exactly one choice must be marked as correct');
    }

    const labels = choices.map(c => c.label.toUpperCase());
    const uniqueLabels = new Set(labels);
    if (labels.length !== uniqueLabels.size) {
      errors.push('Choice labels must be unique');
    }

    const validLabels = ['A', 'B', 'C', 'D', 'E'];
    const invalidLabels = labels.filter(label => !validLabels.includes(label));
    if (invalidLabels.length > 0) {
      errors.push(`Invalid choice labels: ${invalidLabels.join(', ')}. Use A, B, C, D, or E`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if student can take quiz
   */
  static async canStudentTakeQuiz(quizId: string, studentId: string): Promise<boolean> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: {
          attemptsAllowed: true,
        },
      });

      if (!quiz) {
        return false;
      }

      const attemptCount = await prisma.attempt.count({
        where: {
          quizId,
          studentId,
        },
      });

      return attemptCount < quiz.attemptsAllowed;
    } catch (error) {
      console.error('Check student can take quiz error:', error);
      return false;
    }
  }

  /**
   * Get active attempt for student
   */
  static async getActiveAttempt(quizId: string, studentId: string): Promise<AttemptWithDetails | null> {
    try {
      const attempt = await prisma.attempt.findFirst({
        where: {
          quizId,
          studentId,
          finishedAt: null,
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
              duration: true,
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  choices: true,
                },
              },
              choice: true,
            },
          },
        },
      });

      return attempt as AttemptWithDetails | null;
    } catch (error) {
      console.error('Get active attempt error:', error);
      return null;
    }
  }

  /**
   * Get student profile by user ID
   */
  static async getStudentProfileByUserId(userId: string): Promise<{ id: string } | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });

      return student;
    } catch (error) {
      console.error('Get student profile by user ID error:', error);
      return null;
    }
  }

  /**
   * Validate quiz responses for security and integrity
   */
  private static validateQuizResponses(responses: any[], questions: any[]): QuizValidationResult {
    const errors: string[] = [];
    
    // Check if responses array is valid
    if (!Array.isArray(responses)) {
      errors.push('Responses must be an array');
      return { isValid: false, errors };
    }

    const questionIds = questions.map(q => q.id);
    const responseQuestionIds = responses.map(r => r.questionId);
    
    // Check if all questions are answered
    const missingQuestions = questionIds.filter(qId => !responseQuestionIds.includes(qId));
    if (missingQuestions.length > 0) {
      errors.push(`Missing responses for ${missingQuestions.length} question(s)`);
    }

    // Check for extra responses (questions not in quiz)
    const extraQuestions = responseQuestionIds.filter(qId => !questionIds.includes(qId));
    if (extraQuestions.length > 0) {
      errors.push(`Invalid question IDs found: ${extraQuestions.join(', ')}`);
    }

    // Check for duplicate responses
    const duplicateQuestions = responseQuestionIds.filter((qId, index) => responseQuestionIds.indexOf(qId) !== index);
    if (duplicateQuestions.length > 0) {
      errors.push(`Duplicate responses found for questions: ${duplicateQuestions.join(', ')}`);
    }

    // Validate each response
    for (const response of responses) {
      if (!response.questionId || !response.choiceId) {
        errors.push('Each response must have questionId and choiceId');
        continue;
      }

      const question = questions.find(q => q.id === response.questionId);
      if (!question) {
        errors.push(`Invalid question ID: ${response.questionId}`);
        continue;
      }

      const choice = question.choices.find((c: any) => c.id === response.choiceId);
      if (!choice) {
        errors.push(`Invalid choice ID: ${response.choiceId} for question: ${response.questionId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect suspicious activity patterns in quiz submission
   */
  private static detectSuspiciousActivity(attempt: any, responses: any[]): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check submission time patterns
    const timeElapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    const questionsCount = attempt.quiz.questions.length;
    
    // Too fast completion (less than 5 seconds per question)
    if (timeElapsed < questionsCount * 5) {
      reasons.push(`Unusually fast completion: ${timeElapsed} seconds for ${questionsCount} questions`);
    }

    // Check for sequential answer patterns (A, B, C, D, E or all same)
    const choiceLabels = responses.map(r => {
      const question = attempt.quiz.questions.find((q: any) => q.id === r.questionId);
      const choice = question?.choices.find((c: any) => c.id === r.choiceId);
      return choice?.label;
    }).filter(Boolean);

    // All same answers
    if (choiceLabels.length > 3) {
      const uniqueChoices = new Set(choiceLabels);
      if (uniqueChoices.size === 1) {
        reasons.push(`All answers are the same choice: ${Array.from(uniqueChoices)[0]}`);
      }
    }

    // Sequential pattern detection
    if (choiceLabels.length > 4) {
      const isSequential = choiceLabels.every((label, index) => {
        if (index === 0) return true;
        const prevCode = choiceLabels[index - 1]?.charCodeAt(0) || 0;
        const currentCode = label?.charCodeAt(0) || 0;
        return currentCode === prevCode + 1 || (prevCode === 69 && currentCode === 65); // E to A wrap
      });
      
      if (isSequential) {
        reasons.push('Sequential answer pattern detected');
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Auto-submit expired attempt
   */
  private static async autoSubmitExpiredAttempt(attemptId: string, quiz: any): Promise<QuizResult> {
    try {
      // Get existing responses if any
      const existingResponses = await prisma.response.findMany({
        where: { attemptId },
        include: {
          question: {
            include: {
              choices: true,
            },
          },
          choice: true,
        },
      });

      // Calculate score based on existing responses
      let correctAnswers = 0;
      const totalQuestions = quiz.questions?.length || 0;

      for (const response of existingResponses) {
        if (response.choice?.correct) {
          correctAnswers++;
        }
      }

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100 : 0;

      // Update attempt as finished
      const finishedAttempt = await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          score,
          finishedAt: new Date(),
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
              duration: true,
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  choices: true,
                },
              },
              choice: true,
            },
          },
        },
      });

      // Format quiz result
      const quizResult: QuizResult = {
        attemptId: finishedAttempt.id,
        quizId: finishedAttempt.quiz.id,
        quizTitle: finishedAttempt.quiz.title,
        studentId: finishedAttempt.studentId,
        score: finishedAttempt.score || 0,
        totalQuestions,
        correctAnswers,
        startedAt: finishedAttempt.startedAt,
        finishedAt: finishedAttempt.finishedAt!,
        duration: Math.floor((finishedAttempt.finishedAt!.getTime() - finishedAttempt.startedAt.getTime()) / 1000),
        responses: finishedAttempt.responses.map(response => {
          const correctChoice = response.question.choices.find(c => c.correct);
          return {
            questionId: response.questionId,
            questionText: response.question.text,
            selectedChoiceId: response.choiceId,
            selectedChoiceText: response.choice?.text || 'No answer',
            correctChoiceId: correctChoice?.id || '',
            correctChoiceText: correctChoice?.text || '',
            isCorrect: response.choice?.correct || false,
          };
        }),
      };

      return quizResult;
    } catch (error) {
      console.error('Auto-submit expired attempt error:', error);
      throw new Error('Failed to auto-submit expired attempt');
    }
  }

  /**
   * Log suspicious activity for monitoring
   */
  private static async logSuspiciousActivity(attemptId: string, reasons: string[]): Promise<void> {
    try {
      // In a real application, you might want to store this in a separate audit log table
      console.warn(`SECURITY ALERT - Suspicious quiz activity detected:`, {
        attemptId,
        reasons,
        timestamp: new Date().toISOString(),
      });
      
      // You could also implement additional measures like:
      // - Flagging the attempt for manual review
      // - Sending alerts to administrators
      // - Temporarily suspending the student account
      // - Recording in an audit log table
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

}