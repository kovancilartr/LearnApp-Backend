import { Router } from 'express';
import { ParentController } from '../controllers/parent.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All parent routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/parent/children
 * @desc Get all children profiles for the authenticated parent
 * @access Private (Parent only)
 */
router.get('/children', roleMiddleware(['PARENT']), ParentController.getChildrenProfiles);

/**
 * @route GET /api/parent/children/:childId/progress
 * @desc Get detailed progress report for a specific child
 * @access Private (Parent only)
 */
router.get('/children/:childId/progress', roleMiddleware(['PARENT']), ParentController.getChildProgress);

/**
 * @route GET /api/parent/children/:childId/quiz-results
 * @desc Get quiz results for a specific child
 * @access Private (Parent only)
 * @query limit - Optional limit for number of results
 */
router.get('/children/:childId/quiz-results', roleMiddleware(['PARENT']), ParentController.getChildQuizResults);

/**
 * @route POST /api/parent/children/:childId/enrollment-request
 * @desc Create enrollment request for child
 * @access Private (Parent only)
 * @body courseId, message (optional)
 */
router.post('/children/:childId/enrollment-request', roleMiddleware(['PARENT']), ParentController.createEnrollmentRequestForChild);

/**
 * @route GET /api/parent/enrollment-requests
 * @desc Get enrollment requests for all children
 * @access Private (Parent only)
 */
router.get('/enrollment-requests', roleMiddleware(['PARENT']), ParentController.getChildrenEnrollmentRequests);

/**
 * @route GET /api/parent/children/:childId/notifications
 * @desc Get notifications for a specific child
 * @access Private (Parent only)
 * @query limit - Optional limit for number of notifications
 */
router.get('/children/:childId/notifications', roleMiddleware(['PARENT']), ParentController.getChildNotifications);

/**
 * @route GET /api/parent/dashboard
 * @desc Get parent dashboard summary
 * @access Private (Parent only)
 */
router.get('/dashboard', roleMiddleware(['PARENT']), ParentController.getParentDashboardSummary);

export default router;