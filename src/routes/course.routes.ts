import { Router } from "express";
import { CourseController } from "../controllers/course.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { validateRequest } from "../middleware/validation.middleware";
// Role enum'u artık gerekli değil, string'ler kullanıyoruz
import {
  createCourseSchema,
  updateCourseSchema,
  getCourseSchema,
  getCoursesSchema,
  assignTeacherSchema,
  createSectionSchema,
  updateSectionSchema,
  getSectionSchema,
  createLessonSchema,
  updateLessonSchema,
  getLessonSchema,
  enrollStudentSchema,
  unenrollStudentSchema,
  getCourseEnrollmentsSchema,
  getStudentEnrollmentsSchema,
  getCourseProgressSchema,
  markLessonCompleteSchema,
  markLessonIncompleteSchema,
  bulkEnrollSchema,
  bulkUnenrollSchema,
} from "../schemas/course.schema";
import { createEnrollmentRequestSchema } from "../schemas/enrollment.schema";

const router = Router();

// Course Management Routes

/**
 * @route POST /api/courses
 * @desc Create a new course (Admin and Teacher)
 * @access Private (Admin, Teacher)
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(createCourseSchema),
  CourseController.createCourse
);

/**
 * @route GET /api/courses/teacher
 * @desc Get teacher's assigned courses
 * @access Private (Teacher)
 */
router.get(
  "/teacher",
  authMiddleware,
  roleMiddleware(['TEACHER']),
  CourseController.getTeacherCourses
);

/**
 * @route GET /api/courses
 * @desc Get all courses with pagination and filtering
 * @access Public
 */
router.get(
  "/",
  validateRequest(getCoursesSchema),
  CourseController.getAllCourses
);

/**
 * @route GET /api/courses/:id
 * @desc Get course by ID
 * @access Private
 */
router.get(
  "/:id",
  authMiddleware,
  validateRequest(getCourseSchema),
  CourseController.getCourseById
);

/**
 * @route PUT /api/courses/:id
 * @desc Update course (Admin or assigned teacher)
 * @access Private (Admin, Teacher)
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateCourseSchema),
  CourseController.updateCourse
);

/**
 * @route DELETE /api/courses/:id
 * @desc Delete course (Admin only)
 * @access Private (Admin)
 */
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  validateRequest(getCourseSchema),
  CourseController.deleteCourse
);

/**
 * @route PUT /api/courses/:id/teacher
 * @desc Assign teacher to course (Admin only)
 * @access Private (Admin)
 */
router.put(
  "/:id/teacher",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  validateRequest(assignTeacherSchema),
  CourseController.assignTeacher
);

/**
 * @route DELETE /api/courses/:id/teacher
 * @desc Remove teacher from course (Admin only)
 * @access Private (Admin)
 */
router.delete(
  "/:id/teacher",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  validateRequest(getCourseSchema),
  CourseController.removeTeacher
);

/**
 * @route GET /api/courses/teacher/:teacherId
 * @desc Get courses by teacher
 * @access Private (Admin, Teacher)
 */
router.get(
  "/teacher/:teacherId",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  CourseController.getCoursesByTeacher
);

// Section Management Routes

/**
 * @route POST /api/courses/sections
 * @desc Create section in course
 * @access Private (Admin, Teacher)
 */
router.post(
  "/sections",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(createSectionSchema),
  CourseController.createSection
);

/**
 * @route PUT /api/courses/sections/:id
 * @desc Update section
 * @access Private (Admin, Teacher)
 */
router.put(
  "/sections/:id",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateSectionSchema),
  CourseController.updateSection
);

/**
 * @route DELETE /api/courses/sections/:id
 * @desc Delete section
 * @access Private (Admin, Teacher)
 */
router.delete(
  "/sections/:id",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(getSectionSchema),
  CourseController.deleteSection
);

// Lesson Management Routes

/**
 * @route POST /api/courses/lessons
 * @desc Create lesson in section
 * @access Private (Admin, Teacher)
 */
router.post(
  "/lessons",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(createLessonSchema),
  CourseController.createLesson
);

/**
 * @route PUT /api/courses/lessons/:id
 * @desc Update lesson
 * @access Private (Admin, Teacher)
 */
router.put(
  "/lessons/:id",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(updateLessonSchema),
  CourseController.updateLesson
);

/**
 * @route DELETE /api/courses/lessons/:id
 * @desc Delete lesson
 * @access Private (Admin, Teacher)
 */
router.delete(
  "/lessons/:id",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(getLessonSchema),
  CourseController.deleteLesson
);

// Student Enrollment Routes

/**
 * @route POST /api/courses/:id/enrollments
 * @desc Enroll student in course
 * @access Private (Admin, Student)
 */
router.post(
  "/:id/enrollments",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT']),
  validateRequest(enrollStudentSchema),
  CourseController.enrollStudent
);

/**
 * @route DELETE /api/courses/:id/enrollments/:studentId
 * @desc Unenroll student from course
 * @access Private (Admin, Student)
 */
router.delete(
  "/:id/enrollments/:studentId",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT']),
  validateRequest(unenrollStudentSchema),
  CourseController.unenrollStudent
);

/**
 * @route GET /api/courses/:courseId/enrollments
 * @desc Get course enrollments
 * @access Private (Admin, Teacher)
 */
router.get(
  "/:courseId/enrollments",
  authMiddleware,
  roleMiddleware(['ADMIN', 'TEACHER']),
  validateRequest(getCourseEnrollmentsSchema),
  CourseController.getCourseEnrollments
);

/**
 * @route GET /api/courses/student/:studentId/enrollments
 * @desc Get student enrollments
 * @access Private (Admin, Student, Parent)
 */
router.get(
  "/student/:studentId/enrollments",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT', 'PARENT']),
  validateRequest(getStudentEnrollmentsSchema),
  CourseController.getStudentEnrollments
);

/**
 * @route GET /api/courses/student/:studentId/available
 * @desc Get available courses for student
 * @access Private (Admin, Student)
 */
router.get(
  "/student/:studentId/available",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT']),
  CourseController.getAvailableCoursesForStudent
);

// Progress Tracking Routes

/**
 * @route GET /api/courses/:courseId/progress/:studentId
 * @desc Get course progress for student
 * @access Private (Admin, Student, Parent, Teacher)
 */
router.get(
  "/:courseId/progress/:studentId",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT', 'PARENT', 'TEACHER']),
  validateRequest(getCourseProgressSchema),
  CourseController.getCourseProgress
);

// Lesson Completion Routes

/**
 * @route PUT /api/courses/lessons/:lessonId/completion
 * @desc Update lesson completion status
 * @access Private (Student)
 */
router.put(
  "/lessons/:lessonId/completion",
  authMiddleware,
  roleMiddleware(['STUDENT']),
  validateRequest(markLessonCompleteSchema),
  CourseController.markLessonComplete
);

/**
 * @route GET /api/courses/lessons/:lessonId/completion/:studentId
 * @desc Get lesson completion status
 * @access Private (Admin, Student, Parent, Teacher)
 */
router.get(
  "/lessons/:lessonId/completion/:studentId",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT', 'PARENT', 'TEACHER']),
  CourseController.getLessonCompletion
);

// Bulk Operations Routes

/**
 * @route POST /api/courses/:id/enrollments/bulk
 * @desc Bulk enroll students in course (Admin only)
 * @access Private (Admin)
 */
router.post(
  "/:id/enrollments/bulk",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  validateRequest(bulkEnrollSchema),
  CourseController.bulkEnrollStudents
);

/**
 * @route DELETE /api/courses/:id/enrollments/bulk
 * @desc Bulk unenroll students from course (Admin only)
 * @access Private (Admin)
 */
router.delete(
  "/:id/enrollments/bulk",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  validateRequest(bulkUnenrollSchema),
  CourseController.bulkUnenrollStudents
);

// Enrollment Request Routes

/**
 * @route POST /api/courses/:id/enrollment-requests
 * @desc Create enrollment request (Student only)
 * @access Private (Student)
 */
router.post(
  "/:id/enrollment-requests",
  authMiddleware,
  roleMiddleware(['STUDENT']),
  validateRequest(createEnrollmentRequestSchema),
  CourseController.createEnrollmentRequest
);

/**
 * @route GET /api/courses/enrollment-requests
 * @desc Get enrollment requests (Admin only)
 * @access Private (Admin)
 */
router.get(
  "/enrollment-requests",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  CourseController.getEnrollmentRequests
);

/**
 * @route GET /api/courses/students/:studentId/enrollment-requests
 * @desc Get student's enrollment requests
 * @access Private (Admin, Student)
 */
router.get(
  "/students/:studentId/enrollment-requests",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT']),
  CourseController.getStudentEnrollmentRequests
);

/**
 * @route PUT /api/courses/enrollment-requests/:requestId
 * @desc Review enrollment request (Admin only)
 * @access Private (Admin)
 */
router.put(
  "/enrollment-requests/:requestId",
  authMiddleware,
  roleMiddleware(['ADMIN']),
  CourseController.reviewEnrollmentRequest
);

/**
 * @route GET /api/courses/enrollment-requests/:requestId
 * @desc Get enrollment request by ID
 * @access Private (Admin, Student)
 */
router.get(
  "/enrollment-requests/:requestId",
  authMiddleware,
  roleMiddleware(['ADMIN', 'STUDENT']),
  CourseController.getEnrollmentRequestById
);

export default router;