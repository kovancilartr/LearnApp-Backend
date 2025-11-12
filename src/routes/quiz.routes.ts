import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  quizRateLimit, 
  quizSubmissionRateLimit, 
  generalRateLimit 
} from '../middleware/rate-limit.middleware';
import {
  validateQuizTiming,
  validateAttemptLimits,
  validateQuizEnrollment
} from '../middleware/quiz-security.middleware';
import { 
  createQuizSchema, 
  updateQuizSchema, 
  createQuestionSchema, 
  updateQuestionSchema,
  updateChoiceSchema,
  submitQuizAttemptSchema 
} from '../schemas/quiz.schema';
// Role enum'u artık gerekli değil, string'ler kullanıyoruz

const router = Router();

// Apply authentication and general rate limiting to all routes
router.use(authMiddleware);
router.use(generalRateLimit);

// Quiz Management Routes (Admin and Teacher)
router.post(
  '/',
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(createQuizSchema),
  QuizController.createQuiz
);

router.get(
  '/',
  QuizController.getAllQuizzes
);

router.get(
  '/:id',
  QuizController.getQuizById
);

router.put(
  '/:id',
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateQuizSchema),
  QuizController.updateQuiz
);

router.delete(
  '/:id',
  roleMiddleware(['ADMIN', 'TEACHER']),
  QuizController.deleteQuiz
);

// Question Management Routes (Admin and Teacher)
router.post(
  '/:id/questions',
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(createQuestionSchema),
  QuizController.createQuestion
);

// Quiz Attempt Routes (Students) - with enhanced security
router.post(
  '/:id/attempts',
  roleMiddleware(['STUDENT']),
  quizRateLimit,
  validateQuizEnrollment,
  validateAttemptLimits,
  QuizController.startQuizAttempt
);

router.get(
  '/:id/can-take',
  roleMiddleware(['STUDENT']),
  validateQuizEnrollment,
  QuizController.canStudentTakeQuiz
);

// Progress and Statistics Routes
router.get(
  '/:id/progress',
  roleMiddleware(['STUDENT', 'PARENT']),
  QuizController.getStudentQuizProgress
);

router.get(
  '/:id/statistics',
  roleMiddleware(['ADMIN', 'TEACHER']),
  QuizController.getQuizStatistics
);

// Question Routes (Admin and Teacher)
router.put(
  '/questions/:id',
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateQuestionSchema),
  QuizController.updateQuestion
);

router.delete(
  '/questions/:id',
  roleMiddleware(['ADMIN', 'TEACHER']),
  QuizController.deleteQuestion
);

// Choice Routes (Admin and Teacher)
router.put(
  '/choices/:id',
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateChoiceSchema),
  QuizController.updateChoice
);

// Attempt Routes (Students) - with enhanced security
router.post(
  '/attempts/:id/submit',
  roleMiddleware(['STUDENT']),
  quizSubmissionRateLimit,
  validateQuizTiming,
  validateRequest(submitQuizAttemptSchema),
  QuizController.submitQuizAttempt
);

router.get(
  '/attempts/:id/result',
  QuizController.getQuizResult
);

export default router;