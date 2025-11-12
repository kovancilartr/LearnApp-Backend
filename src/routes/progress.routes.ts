import { Router } from "express";
import { ProgressController } from "../controllers/progress.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { progressSchemas } from "../schemas/progress.schema";
// Role enum'u artık gerekli değil, string'ler kullanıyoruz

const router = Router();

// All progress routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/progress/lesson-completion:
 *   post:
 *     summary: Update lesson completion status
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonId
 *               - completed
 *             properties:
 *               lessonId:
 *                 type: string
 *                 format: uuid
 *               completed:
 *                 type: boolean
 *               childId:
 *                 type: string
 *                 format: uuid
 *                 description: Required for parent users
 *     responses:
 *       200:
 *         description: Lesson completion updated successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Lesson or student not found
 */
router.post(
  "/lesson-completion",
  roleMiddleware(['STUDENT', 'PARENT']),
  validateRequest(progressSchemas.updateLessonCompletion),
  ProgressController.updateLessonCompletion
);

/**
 * @swagger
 * /api/progress/course/{courseId}/student/{studentId}:
 *   get:
 *     summary: Get course progress for student
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Course progress retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Course or student not found
 */
router.get(
  "/course/:courseId/student/:studentId",
  validateRequest(progressSchemas.getCourseProgress),
  ProgressController.getCourseProgress
);

/**
 * @swagger
 * /api/progress/student/{studentId}/summary:
 *   get:
 *     summary: Get student progress summary across all courses
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Student progress summary retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Student not found
 */
router.get(
  "/student/:studentId/summary",
  validateRequest(progressSchemas.getStudentProgress),
  ProgressController.getStudentProgressSummary
);

/**
 * @swagger
 * /api/progress/parent/children:
 *   get:
 *     summary: Get progress view for all children (parent only)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Children progress retrieved successfully
 *       403:
 *         description: Only parents can access this endpoint
 *       404:
 *         description: Parent profile not found
 */
router.get(
  "/parent/children",
  roleMiddleware(['PARENT']),
  ProgressController.getParentProgressView
);

/**
 * @swagger
 * /api/progress/teacher/overview:
 *   get:
 *     summary: Get teacher progress overview for assigned courses
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Required for admin users
 *     responses:
 *       200:
 *         description: Teacher progress overview retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Teacher not found
 */
router.get(
  "/teacher/overview",
  roleMiddleware(['TEACHER', 'ADMIN']),
  ProgressController.getTeacherProgressOverview
);

/**
 * @swagger
 * /api/progress/course/{courseId}/stats:
 *   get:
 *     summary: Get course completion statistics
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Course completion statistics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Course not found
 */
router.get(
  "/course/:courseId/stats",
  roleMiddleware(['TEACHER', 'ADMIN']),
  validateRequest(progressSchemas.getCourseStats),
  ProgressController.getCourseCompletionStats
);

/**
 * @swagger
 * /api/progress/student/{studentId}/recent-completions:
 *   get:
 *     summary: Get recent lesson completions for student
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent completions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Student not found
 */
router.get(
  "/student/:studentId/recent-completions",
  validateRequest(progressSchemas.getRecentCompletions),
  ProgressController.getRecentCompletions
);

/**
 * @swagger
 * /api/progress/lesson/{lessonId}/student/{studentId}/status:
 *   get:
 *     summary: Get detailed lesson completion status for student
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lesson completion details retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Lesson or student not found
 */
router.get(
  "/lesson/:lessonId/student/:studentId/status",
  validateRequest(progressSchemas.getLessonStatus),
  ProgressController.getLessonCompletionStatus
);

/**
 * @swagger
 * /api/progress/course/{courseId}/analytics:
 *   get:
 *     summary: Get detailed course completion analytics
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional student ID for student-specific analytics
 *     responses:
 *       200:
 *         description: Course completion analytics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Course not found
 */
router.get(
  "/course/:courseId/analytics",
  roleMiddleware(['TEACHER', 'ADMIN', 'STUDENT', 'PARENT']),
  validateRequest(progressSchemas.getCourseAnalytics),
  ProgressController.getCourseCompletionAnalytics
);

/**
 * @swagger
 * /api/progress/course/{courseId}/student/{studentId}/detailed-analytics:
 *   get:
 *     summary: Get detailed progress analytics for a specific course and student
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed progress analytics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Course or student not found
 */
router.get(
  "/course/:courseId/student/:studentId/detailed-analytics",
  roleMiddleware(['TEACHER', 'ADMIN', 'STUDENT', 'PARENT']),
  validateRequest(progressSchemas.getDetailedAnalytics),
  ProgressController.getDetailedProgressAnalytics
);

/**
 * @swagger
 * /api/progress/student/{studentId}/bulk-analytics:
 *   get:
 *     summary: Get bulk progress analytics for all student's courses
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bulk progress analytics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Student not found
 */
router.get(
  "/student/:studentId/bulk-analytics",
  roleMiddleware(['ADMIN', 'STUDENT', 'PARENT']),
  validateRequest(progressSchemas.getBulkAnalytics),
  ProgressController.getBulkProgressAnalytics
);

/**
 * @swagger
 * /api/progress/parent/detailed-report:
 *   get:
 *     summary: Get detailed progress report for all children (parent only)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed progress report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parentInfo:
 *                   type: object
 *                 reportGeneratedAt:
 *                   type: string
 *                   format: date-time
 *                 overallSummary:
 *                   type: object
 *                 childrenReports:
 *                   type: array
 *       403:
 *         description: Only parents can access this endpoint
 *       404:
 *         description: Parent profile not found
 */
router.get(
  "/parent/detailed-report",
  roleMiddleware(['PARENT']),
  ProgressController.getDetailedParentProgressReport
);

/**
 * @swagger
 * /api/progress/parent/children-comparison:
 *   get:
 *     summary: Get progress comparison between children (parent only)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Children progress comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparisonGeneratedAt:
 *                   type: string
 *                   format: date-time
 *                 children:
 *                   type: array
 *                 insights:
 *                   type: object
 *       403:
 *         description: Only parents can access this endpoint
 *       404:
 *         description: Parent profile not found
 */
router.get(
  "/parent/children-comparison",
  roleMiddleware(['PARENT']),
  ProgressController.getChildrenProgressComparison
);

/**
 * @swagger
 * /api/progress/parent/export:
 *   get:
 *     summary: Export parent progress data in various formats
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Progress data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 format:
 *                   type: string
 *                 data:
 *                   type: object
 *                 filename:
 *                   type: string
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid format or date range
 *       403:
 *         description: Only parents can export progress data
 *       404:
 *         description: Parent profile not found
 */
router.get(
  "/parent/export",
  roleMiddleware(['PARENT']),
  validateRequest(progressSchemas.exportParentProgress),
  ProgressController.exportParentProgressData
);

/**
 * @swagger
 * /api/progress/parent/notifications:
 *   get:
 *     summary: Get progress notifications for parent
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [achievement, milestone, reminder, concern]
 *                       priority:
 *                         type: string
 *                         enum: [high, medium, low]
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       childId:
 *                         type: string
 *                       childName:
 *                         type: string
 *                       actionRequired:
 *                         type: boolean
 *                 summary:
 *                   type: object
 *       403:
 *         description: Only parents can access progress notifications
 *       404:
 *         description: Parent profile not found
 */
router.get(
  "/parent/notifications",
  roleMiddleware(['PARENT']),
  ProgressController.getParentProgressNotifications
);

export { router as progressRoutes };