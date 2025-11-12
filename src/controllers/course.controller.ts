import { Request, Response } from 'express';
import { CourseService } from '../services/course.service';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types';
import { prisma } from '../config/database';
import { serializeCourse } from '../utils/serializers';

export class CourseController {
  // Course Management Endpoints

  /**
   * Create a new course (Admin and Teacher)
   */
  static async createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description, teacherId } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== Role.ADMIN && userRole !== Role.TEACHER) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins and teachers can create courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let finalTeacherId = teacherId;

      // If teacher is creating the course, find their teacher record and assign them
      if (userRole === Role.TEACHER) {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: userId },
          select: { id: true }
        });

        if (!teacher) {
          res.status(400).json({
            success: false,
            error: {
              code: 'TEACHER_NOT_FOUND',
              message: 'Teacher record not found for this user',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        finalTeacherId = teacher.id;
      }

      const course = await CourseService.createCourse({
        title,
        description,
        teacherId: finalTeacherId,
      });

      res.status(201).json({
        success: true,
        data: course,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_COURSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get teacher's assigned courses
   */
  static async getTeacherCourses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (userRole !== Role.TEACHER) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only teachers can access this endpoint',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Find teacher record by userId
      const teacher = await prisma.teacher.findUnique({
        where: { userId: userId },
        select: { id: true }
      });

      if (!teacher) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TEACHER_NOT_FOUND',
            message: 'Teacher record not found for this user',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const courses = await CourseService.getTeacherCourses(teacher.id);

      res.status(200).json({
        success: true,
        data: courses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get teacher courses error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_TEACHER_COURSES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get teacher courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all courses with pagination and filtering
   */
  static async getAllCourses(req: Request, res: Response): Promise<void> {
    try {
      const { search, teacherId, page, limit } = req.query;

      const courses = await CourseService.getAllCourses({
        search: search as string,
        teacherId: teacherId as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: courses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get all courses error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_COURSES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get course by ID
   */
  static async getCourseById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const course = await CourseService.getCourseById(id, userId);

      res.status(200).json({
        success: true,
        data: course,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get course by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Course not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'GET_COURSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update course (Admin or assigned teacher)
   */
  static async updateCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      const course = await CourseService.updateCourse(
        id,
        { title, description },
        userId,
        userRole as Role
      );

      res.status(200).json({
        success: true,
        data: course,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update course error:', error);
      const statusCode = error instanceof Error && error.message === 'Course not found' ? 404 : 
                         error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_COURSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete course (Admin only)
   */
  static async deleteCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can delete courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await CourseService.deleteCourse(id);

      res.status(200).json({
        success: true,
        data: { message: 'Course deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete course error:', error);
      const statusCode = error instanceof Error && error.message === 'Course not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_COURSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Assign teacher to course (Admin only)
   */
  static async assignTeacher(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, teacherId } = req.body;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can assign teachers to courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const course = await CourseService.assignTeacherToCourse({
        courseId,
        teacherId,
      });

      res.status(200).json({
        success: true,
        data: course,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Assign teacher error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ASSIGN_TEACHER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to assign teacher',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Remove teacher from course (Admin only)
   */
  static async removeTeacher(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can remove teachers from courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const course = await CourseService.removeTeacherFromCourse(id);

      res.status(200).json({
        success: true,
        data: course,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Remove teacher error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REMOVE_TEACHER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove teacher',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get courses by teacher (Teacher only)
   */
  static async getCoursesByTeacher(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teacherId } = req.params;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      // Check permissions - admin can view any teacher's courses, teacher can only view their own
      if (userRole !== Role.ADMIN && userId !== teacherId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only view your own courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const courses = await CourseService.getCoursesByTeacher(teacherId);

      res.status(200).json({
        success: true,
        data: courses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get courses by teacher error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_TEACHER_COURSES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get teacher courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Section Management Endpoints

  /**
   * Create section in course
   */
  static async createSection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, courseId, order } = req.body;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      const section = await CourseService.createSection(
        { title, courseId, order },
        userId,
        userRole as Role
      );

      res.status(201).json({
        success: true,
        data: section,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create section error:', error);
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'CREATE_SECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create section',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update section
   */
  static async updateSection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, order } = req.body;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      const section = await CourseService.updateSection(
        id,
        { title, order },
        userId,
        userRole as Role
      );

      res.status(200).json({
        success: true,
        data: section,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update section error:', error);
      const statusCode = error instanceof Error && error.message === 'Section not found' ? 404 :
                         error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_SECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update section',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete section
   */
  static async deleteSection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      await CourseService.deleteSection(id, userId, userRole as Role);

      res.status(200).json({
        success: true,
        data: { message: 'Section deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete section error:', error);
      const statusCode = error instanceof Error && error.message === 'Section not found' ? 404 :
                         error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_SECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete section',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Lesson Management Endpoints

  /**
   * Create lesson in section
   */
  static async createLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, content, videoUrl, pdfUrl, sectionId, order } = req.body;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      const lesson = await CourseService.createLesson(
        { title, content, videoUrl, pdfUrl, sectionId, order },
        userId,
        userRole as Role
      );

      res.status(201).json({
        success: true,
        data: lesson,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create lesson error:', error);
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'CREATE_LESSON_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update lesson
   */
  static async updateLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, videoUrl, pdfUrl, order } = req.body;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      const lesson = await CourseService.updateLesson(
        id,
        { title, content, videoUrl, pdfUrl, order },
        userId,
        userRole as Role
      );

      res.status(200).json({
        success: true,
        data: lesson,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update lesson error:', error);
      const statusCode = error instanceof Error && error.message === 'Lesson not found' ? 404 :
                         error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'UPDATE_LESSON_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete lesson
   */
  static async deleteLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;
      const userRole = req.user?.role!;

      await CourseService.deleteLesson(id, userId, userRole as Role);

      res.status(200).json({
        success: true,
        data: { message: 'Lesson deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Delete lesson error:', error);
      const statusCode = error instanceof Error && error.message === 'Lesson not found' ? 404 :
                         error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_LESSON_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Student Enrollment Endpoints

  /**
   * Enroll student in course
   */
  static async enrollStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentId } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      let actualStudentId = studentId;

      // If student is enrolling themselves, find their student profile ID
      if (userRole === Role.STUDENT) {
        const student = await prisma.student.findUnique({
          where: { userId: userId },
          select: { id: true }
        });

        if (!student) {
          res.status(400).json({
            success: false,
            error: {
              code: 'STUDENT_NOT_FOUND',
              message: 'Student record not found for this user',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        actualStudentId = student.id;

        // Students can only enroll themselves
        if (studentId && studentId !== student.id) {
          res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Students can only enroll themselves',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      if (userRole !== Role.ADMIN && userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins and students can enroll in courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const enrollment = await CourseService.enrollStudent({
        courseId,
        studentId: actualStudentId,
      });

      res.status(201).json({
        success: true,
        data: enrollment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Enroll student error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'ENROLL_STUDENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to enroll student',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Unenroll student from course
   */
  static async unenrollStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentId } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Admin can unenroll any student, student can only unenroll themselves
      if (userRole === Role.STUDENT && userId !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only unenroll themselves',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (userRole !== Role.ADMIN && userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins and students can unenroll from courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await CourseService.unenrollStudent({
        courseId,
        studentId,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Student unenrolled successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Unenroll student error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'UNENROLL_STUDENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to unenroll student',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get course enrollments
   */
  static async getCourseEnrollments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN && userRole !== Role.TEACHER) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins and teachers can view course enrollments',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const enrollments = await CourseService.getCourseEnrollments(courseId);

      res.status(200).json({
        success: true,
        data: enrollments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get course enrollments error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ENROLLMENTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get course enrollments',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get student enrollments
   */
  static async getStudentEnrollments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      let actualStudentId = studentId;

      // If student is requesting their own enrollments, find their student profile ID
      if (userRole === Role.STUDENT && userId === studentId) {
        const student = await prisma.student.findUnique({
          where: { userId: userId },
          select: { id: true }
        });

        if (!student) {
          res.status(400).json({
            success: false,
            error: {
              code: 'STUDENT_NOT_FOUND',
              message: 'Student record not found for this user',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        actualStudentId = student.id;
      } else if (userRole === Role.STUDENT && userId !== studentId) {
        // Student trying to access another student's enrollments
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own enrollments',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const enrollments = await CourseService.getStudentEnrollments(actualStudentId);

      res.status(200).json({
        success: true,
        data: enrollments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get student enrollments error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STUDENT_ENROLLMENTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get student enrollments',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get available courses for student
   */
  static async getAvailableCoursesForStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Admin can view available courses for any student, student can only view their own
      if (userRole === Role.STUDENT && userId !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own available courses',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const courses = await CourseService.getAvailableCoursesForStudent(studentId);

      res.status(200).json({
        success: true,
        data: courses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get available courses error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_AVAILABLE_COURSES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get available courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Progress Tracking Endpoints

  /**
   * Get course progress for student
   */
  static async getCourseProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      let { studentId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // If no studentId provided, use current user's ID (for student role)
      if (!studentId && userRole === Role.STUDENT) {
        studentId = userId!;
      }

      // Validate studentId is provided
      if (!studentId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STUDENT_ID',
            message: 'Student ID is required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Admin can view any student's progress, student can only view their own, parent can view their children's
      if (userRole === Role.STUDENT && userId !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own progress',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const progress = await CourseService.getCourseProgress(courseId, studentId);

      res.status(200).json({
        success: true,
        data: progress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get course progress error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_PROGRESS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get course progress',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Lesson Completion Endpoints

  /**
   * Mark lesson as completed
   */
  static async markLessonComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lessonId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id!;

      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can mark lessons as complete',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await CourseService.markLessonComplete(lessonId, userId);

      res.status(200).json({
        success: true,
        data: { message: 'Lesson marked as complete' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Mark lesson complete error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'MARK_LESSON_COMPLETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to mark lesson as complete',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mark lesson as incomplete
   */
  static async markLessonIncomplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lessonId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id!;

      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can mark lessons as incomplete',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await CourseService.markLessonIncomplete(lessonId, userId);

      res.status(200).json({
        success: true,
        data: { message: 'Lesson marked as incomplete' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Mark lesson incomplete error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'MARK_LESSON_INCOMPLETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to mark lesson as incomplete',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get lesson completion status
   */
  static async getLessonCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { lessonId, studentId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Admin can view any student's completion, student can only view their own
      if (userRole === Role.STUDENT && userId !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own lesson completion',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const completion = await CourseService.getLessonCompletion(lessonId, studentId);

      res.status(200).json({
        success: true,
        data: completion,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get lesson completion error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_LESSON_COMPLETION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get lesson completion',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Bulk Operations

  /**
   * Bulk enroll students in course (Admin only)
   */
  static async bulkEnrollStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentIds } = req.body;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can bulk enroll students',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await CourseService.bulkEnrollStudents(courseId, studentIds);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk enroll students error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'BULK_ENROLL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to bulk enroll students',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Bulk unenroll students from course (Admin only)
   */
  static async bulkUnenrollStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { courseId, studentIds } = req.body;
      const userRole = req.user?.role;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can bulk unenroll students',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await CourseService.bulkUnenrollStudents(courseId, studentIds);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Bulk unenroll students error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'BULK_UNENROLL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to bulk unenroll students',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Enrollment Request Endpoints

  /**
   * Create enrollment request (Student only)
   */
  static async createEnrollmentRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: courseId } = req.params;
      const { message } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== Role.STUDENT) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only students can create enrollment requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Find student record by userId
      const student = await prisma.student.findUnique({
        where: { userId: userId },
        select: { id: true }
      });

      if (!student) {
        res.status(400).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student record not found for this user',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const enrollmentRequest = await CourseService.createEnrollmentRequest({
        studentId: student.id,
        courseId,
        message,
      });

      res.status(201).json({
        success: true,
        data: enrollmentRequest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Create enrollment request error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_ENROLLMENT_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create enrollment request',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment requests (Admin only)
   */
  static async getEnrollmentRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const { status, courseId, studentId } = req.query;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can view enrollment requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const requests = await CourseService.getEnrollmentRequests({
        status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        courseId: courseId as string | undefined,
        studentId: studentId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: requests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get enrollment requests error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_ENROLLMENT_REQUESTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get enrollment requests',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get student's enrollment requests
   */
  static async getStudentEnrollmentRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Find student record by userId for current user
      const currentStudent = await prisma.student.findUnique({
        where: { userId: userId },
        select: { id: true }
      });

      // Admin can view any student's requests, student can only view their own
      if (userRole === Role.STUDENT && currentStudent?.id !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own enrollment requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const requests = await CourseService.getStudentEnrollmentRequests(studentId);

      res.status(200).json({
        success: true,
        data: requests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get student enrollment requests error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'GET_STUDENT_ENROLLMENT_REQUESTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get student enrollment requests',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Review enrollment request (Admin only)
   */
  static async reviewEnrollmentRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { status, adminNote } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== Role.ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only admins can review enrollment requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Status must be either APPROVED or REJECTED',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedRequest = await CourseService.reviewEnrollmentRequest({
        requestId,
        status,
        adminNote,
        reviewedBy: userId!,
      });

      res.status(200).json({
        success: true,
        data: updatedRequest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Review enrollment request error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'REVIEW_ENROLLMENT_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to review enrollment request',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get enrollment request by ID
   */
  static async getEnrollmentRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const request = await CourseService.getEnrollmentRequestById(requestId);

      // Find current student record
      const currentStudent = await prisma.student.findUnique({
        where: { userId: userId },
        select: { id: true }
      });

      // Admin can view any request, student can only view their own
      if (userRole === Role.STUDENT && currentStudent?.id !== request.studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Students can only view their own enrollment requests',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: request,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get enrollment request by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Enrollment request not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'GET_ENROLLMENT_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get enrollment request',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}