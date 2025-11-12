import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";

const router = Router();

// All analytics routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

/**
 * @route GET /api/analytics/dashboard
 * @desc Get dashboard statistics
 * @access Private (Admin only)
 */
router.get("/dashboard", AnalyticsController.getDashboardStats);

/**
 * @route GET /api/analytics/courses
 * @desc Get course analytics
 * @access Private (Admin only)
 */
router.get("/courses", AnalyticsController.getCourseAnalytics);

/**
 * @route GET /api/analytics/users
 * @desc Get user analytics
 * @access Private (Admin only)
 */
router.get("/users", AnalyticsController.getUserAnalytics);

/**
 * @route GET /api/analytics/enrollments
 * @desc Get enrollment trends
 * @access Private (Admin only)
 */
router.get("/enrollments", AnalyticsController.getEnrollmentTrends);

/**
 * @route GET /api/analytics/teachers
 * @desc Get teacher assignments
 * @access Private (Admin only)
 */
router.get("/teachers", AnalyticsController.getTeacherAssignments);

/**
 * @route GET /api/analytics/usage
 * @desc Get system usage statistics
 * @access Private (Admin only)
 */
router.get("/usage", AnalyticsController.getSystemUsageStats);

/**
 * @route GET /api/analytics/overview
 * @desc Get comprehensive analytics overview
 * @access Private (Admin only)
 */
router.get("/overview", AnalyticsController.getAnalyticsOverview);

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data
 * @access Private (Admin only)
 * @query type - Type of data to export (dashboard, courses, users, enrollments, teachers, overview)
 * @query format - Export format (json, csv)
 */
router.get("/export", AnalyticsController.exportAnalyticsData);

export default router;