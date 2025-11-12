import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { QuizService } from '../services/quiz.service';
import { Role } from '@prisma/client';
import {
  CreateQuizRequest,
  UpdateQuizRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  UpdateChoiceRequest,
  StartQuizAttemptRequest,
  SubmitQuizAttemptRequest,
  QuizSearchQuery,
} from '../types/quiz.types';

export class QuizController {
  /**
   * Create a new quiz (Admin or assigned teacher)
   * POST /api/quizzes
   */
  static async createQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only admins and teachers can create quizzes
      if (userRole !== Role.ADMIN && userRole !== Role.TEACHER) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins and teachers can create quizzes',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const createQuizData: CreateQuizRequest = req.body;
      const quiz = await QuizService.createQuiz(createQuizData, userId, userRole);

      res.status(201).json({
        success: true,
        data: quiz,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create quiz error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_QUIZ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create quiz',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get quiz by ID
   * GET /api/quizzes/:id
   */
  static async getQuizById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      const quiz = await QuizService.getQuizById(id, userId, userRole);

      res.json({
        success: true,
        data: quiz,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get quiz by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Quiz not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'GET_QUIZ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get quiz',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all quizzes with pagination and filtering
   * GET /api/quizzes
   */
  static async getAllQuizzes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query: QuizSearchQuery = {
        courseId: req.query.courseId as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const result = await QuizService.getAllQuizzes(query);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get all quizzes error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_QUIZZES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get quizzes',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update quiz (Admin or assigned teacher)
   * PUT /api/quizzes/:id
   */
  static async updateQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateQuizData: UpdateQuizRequest = req.body;
      const quiz = await QuizService.updateQuiz(id, updateQuizData, userId, userRole);

      res.json({
        success: true,
        data: quiz,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update quiz error:', error);
      const statusCode = error instanceof Error && error.message === 'Quiz not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_QUIZ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update quiz',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete quiz (Admin or assigned teacher)
   * DELETE /api/quizzes/:id
   */
  static async deleteQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await QuizService.deleteQuiz(id, userId, userRole);

      res.status(204).send();
    } catch (error) {
      console.error('Delete quiz error:', error);
      const statusCode = error instanceof Error && error.message === 'Quiz not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_QUIZ_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete quiz',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Question Management Endpoints

  /**
   * Create question in quiz
   * POST /api/quizzes/:id/questions
   */
  static async createQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const createQuestionData: CreateQuestionRequest = {
        ...req.body,
        quizId,
      };

      const question = await QuizService.createQuestion(createQuestionData, userId, userRole);

      res.status(201).json({
        success: true,
        data: question,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create question error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_QUESTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create question',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update question
   * PUT /api/questions/:id
   */
  static async updateQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateQuestionData: UpdateQuestionRequest = req.body;
      const question = await QuizService.updateQuestion(id, updateQuestionData, userId, userRole);

      res.json({
        success: true,
        data: question,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update question error:', error);
      const statusCode = error instanceof Error && error.message === 'Question not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_QUESTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update question',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete question
   * DELETE /api/questions/:id
   */
  static async deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await QuizService.deleteQuestion(id, userId, userRole);

      res.status(204).send();
    } catch (error) {
      console.error('Delete question error:', error);
      const statusCode = error instanceof Error && error.message === 'Question not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_QUESTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete question',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update choice
   * PUT /api/choices/:id
   */
  static async updateChoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateChoiceData: UpdateChoiceRequest = req.body;
      await QuizService.updateChoice(id, updateChoiceData, userId, userRole);

      res.status(204).send();
    } catch (error) {
      console.error('Update choice error:', error);
      const statusCode = error instanceof Error && error.message === 'Choice not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_CHOICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update choice',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Quiz Attempt Endpoints

  /**
   * Start quiz attempt (Students only)
   * POST /api/quizzes/:id/attempts
   */
  static async startQuizAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only students can start quiz attempts
      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only students can start quiz attempts',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get student profile
      const studentProfile = await QuizService.getStudentProfileByUserId(userId);
      if (!studentProfile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const startAttemptData: StartQuizAttemptRequest = {
        quizId,
        studentId: studentProfile.id,
      };

      const attempt = await QuizService.startQuizAttempt(startAttemptData);

      res.status(201).json({
        success: true,
        data: attempt,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Start quiz attempt error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'START_ATTEMPT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to start quiz attempt',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Submit quiz attempt (Students only) with enhanced security
   * POST /api/attempts/:id/submit
   */
  static async submitQuizAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: attemptId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only students can submit quiz attempts
      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only students can submit quiz attempts',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Additional security checks from middleware
      const quizAttempt = (req as any).quizAttempt;
      const quizTiming = (req as any).quizTiming;

      if (!quizAttempt) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ATTEMPT',
            message: 'Invalid quiz attempt',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Log submission attempt for security monitoring
      console.log(`Quiz submission attempt:`, {
        attemptId,
        userId,
        quizId: quizAttempt.quiz.id,
        timing: quizTiming,
        responseCount: req.body.responses?.length || 0,
        timestamp: new Date().toISOString(),
      });

      const submitAttemptData: SubmitQuizAttemptRequest = {
        attemptId,
        responses: req.body.responses,
      };

      const result = await QuizService.submitQuizAttempt(submitAttemptData);

      // Log successful submission
      console.log(`Quiz submission successful:`, {
        attemptId,
        userId,
        score: result.score,
        duration: result.duration,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Submit quiz attempt error:', error);
      
      // Log failed submission for security monitoring
      console.warn(`Quiz submission failed:`, {
        attemptId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Determine appropriate status code based on error type
      let statusCode = 400;
      let errorCode = 'SUBMIT_ATTEMPT_FAILED';

      if (error instanceof Error) {
        if (error.message.includes('Time limit exceeded')) {
          statusCode = 408; // Request Timeout
          errorCode = 'TIME_LIMIT_EXCEEDED';
        } else if (error.message.includes('already submitted')) {
          statusCode = 409; // Conflict
          errorCode = 'ALREADY_SUBMITTED';
        } else if (error.message.includes('Invalid')) {
          statusCode = 422; // Unprocessable Entity
          errorCode = 'INVALID_DATA';
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error instanceof Error ? error.message : 'Failed to submit quiz attempt',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get quiz result by attempt ID
   * GET /api/attempts/:id/result
   */
  static async getQuizResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: attemptId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await QuizService.getQuizResult(attemptId, userId, userRole);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get quiz result error:', error);
      const statusCode = error instanceof Error && error.message === 'Attempt not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'GET_RESULT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get quiz result',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get student quiz progress
   * GET /api/quizzes/:id/progress
   */
  static async getStudentQuizProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let studentId: string;

      if (userRole === Role.STUDENT) {
        // Get student's own progress
        const studentProfile = await QuizService.getStudentProfileByUserId(userId);
        if (!studentProfile) {
          res.status(404).json({
            success: false,
            error: {
              code: 'STUDENT_NOT_FOUND',
              message: 'Student profile not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        studentId = studentProfile.id;
      } else if (userRole === Role.PARENT) {
        // Parent viewing child's progress - get studentId from query params
        const childStudentId = req.query.studentId as string;
        if (!childStudentId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_STUDENT_ID',
              message: 'Student ID is required for parent access',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        studentId = childStudentId;
      } else {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only students and parents can view quiz progress',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const progress = await QuizService.getStudentQuizProgress(quizId, studentId);

      res.json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get student quiz progress error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_PROGRESS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get quiz progress',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get quiz statistics (Teachers and Admins only)
   * GET /api/quizzes/:id/statistics
   */
  static async getQuizStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only teachers and admins can view quiz statistics
      if (userRole !== Role.TEACHER && userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only teachers and admins can view quiz statistics',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const statistics = await QuizService.getQuizStatistics(quizId, userId, userRole);

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get quiz statistics error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STATISTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get quiz statistics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if student can take quiz
   * GET /api/quizzes/:id/can-take
   */
  static async canStudentTakeQuiz(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role as Role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only students can check if they can take a quiz
      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only students can check quiz availability',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get student profile
      const studentProfile = await QuizService.getStudentProfileByUserId(userId);
      if (!studentProfile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student profile not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const canTake = await QuizService.canStudentTakeQuiz(quizId, studentProfile.id);

      res.json({
        success: true,
        data: { canTake },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Can student take quiz error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_QUIZ_AVAILABILITY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check quiz availability',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}