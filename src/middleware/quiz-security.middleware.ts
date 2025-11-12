import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../config/database';
import { createErrorResponse } from '../utils/response.utils';

/**
 * Middleware to validate quiz attempt timing and prevent cheating
 */
export const validateQuizTiming = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: attemptId } = req.params;
    
    if (!attemptId) {
      const response = createErrorResponse('MISSING_ATTEMPT_ID', 'Attempt ID is required');
      res.status(400).json(response);
      return;
    }

    // Get attempt with quiz details
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            duration: true,
            title: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      const response = createErrorResponse('ATTEMPT_NOT_FOUND', 'Quiz attempt not found');
      res.status(404).json(response);
      return;
    }

    // Verify ownership
    if (attempt.student.user.id !== req.user?.id) {
      const response = createErrorResponse('UNAUTHORIZED_ATTEMPT', 'You can only submit your own quiz attempts');
      res.status(403).json(response);
      return;
    }

    // Check if already finished
    if (attempt.finishedAt) {
      const response = createErrorResponse('ATTEMPT_ALREADY_FINISHED', 'This quiz attempt has already been submitted');
      res.status(400).json(response);
      return;
    }

    // Check timing if quiz has duration
    if (attempt.quiz.duration) {
      const timeElapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
      const allowedTime = attempt.quiz.duration + 30; // 30 seconds grace period
      
      if (timeElapsed > allowedTime) {
        const response = createErrorResponse('TIME_LIMIT_EXCEEDED', 'Quiz time limit has been exceeded');
        res.status(400).json(response);
        return;
      }

      // Add timing info to request for use in controller
      req.quizTiming = {
        timeElapsed,
        allowedTime: attempt.quiz.duration,
        remainingTime: Math.max(0, attempt.quiz.duration - timeElapsed),
      };
    }

    // Add attempt info to request
    req.quizAttempt = attempt;
    
    next();
  } catch (error) {
    console.error('Quiz timing validation error:', error);
    const response = createErrorResponse('TIMING_VALIDATION_ERROR', 'Failed to validate quiz timing');
    res.status(500).json(response);
  }
};

/**
 * Middleware to validate quiz attempt limits
 */
export const validateAttemptLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
      res.status(401).json(response);
      return;
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      const response = createErrorResponse('STUDENT_NOT_FOUND', 'Student profile not found');
      res.status(404).json(response);
      return;
    }

    // Get quiz with attempt limits
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        attemptsAllowed: true,
      },
    });

    if (!quiz) {
      const response = createErrorResponse('QUIZ_NOT_FOUND', 'Quiz not found');
      res.status(404).json(response);
      return;
    }

    // Check existing attempts
    const existingAttempts = await prisma.attempt.count({
      where: {
        quizId,
        studentId: student.id,
      },
    });

    if (existingAttempts >= quiz.attemptsAllowed) {
      const response = createErrorResponse('ATTEMPT_LIMIT_EXCEEDED', `Maximum attempts (${quiz.attemptsAllowed}) reached for this quiz`);
      res.status(400).json(response);
      return;
    }

    // Check for active attempt
    const activeAttempt = await prisma.attempt.findFirst({
      where: {
        quizId,
        studentId: student.id,
        finishedAt: null,
      },
    });

    if (activeAttempt) {
      const response = createErrorResponse('ACTIVE_ATTEMPT_EXISTS', 'You already have an active attempt for this quiz');
      res.status(400).json(response);
      return;
    }

    // Add student info to request
    req.studentProfile = student;
    
    next();
  } catch (error) {
    console.error('Attempt limits validation error:', error);
    const response = createErrorResponse('ATTEMPT_VALIDATION_ERROR', 'Failed to validate attempt limits');
    res.status(500).json(response);
  }
};

/**
 * Middleware to validate quiz enrollment
 */
export const validateQuizEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      const response = createErrorResponse('UNAUTHORIZED', 'Authentication required');
      res.status(401).json(response);
      return;
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                quizzes: {
                  where: { id: quizId },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      const response = createErrorResponse('STUDENT_NOT_FOUND', 'Student profile not found');
      res.status(404).json(response);
      return;
    }

    // Check if student is enrolled in the course that contains this quiz
    const isEnrolled = student.enrollments.some(enrollment => 
      enrollment.course.quizzes.length > 0
    );

    if (!isEnrolled) {
      const response = createErrorResponse('NOT_ENROLLED', 'You are not enrolled in the course for this quiz');
      res.status(403).json(response);
      return;
    }

    next();
  } catch (error) {
    console.error('Quiz enrollment validation error:', error);
    const response = createErrorResponse('ENROLLMENT_VALIDATION_ERROR', 'Failed to validate quiz enrollment');
    res.status(500).json(response);
  }
};

// Extend AuthenticatedRequest interface
declare module './auth.middleware' {
  interface AuthenticatedRequest {
    quizTiming?: {
      timeElapsed: number;
      allowedTime: number;
      remainingTime: number;
    };
    quizAttempt?: any;
    studentProfile?: { id: string };
  }
}