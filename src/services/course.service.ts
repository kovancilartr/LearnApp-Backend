import { prisma } from "../config/database";
import { Role } from "@prisma/client";
import {
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseWithDetails,
  CourseListItem,
  CourseSearchQuery,
  AssignTeacherRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  SectionWithLessons,
  CreateLessonRequest,
  UpdateLessonRequest,
  LessonWithDetails,
  EnrollStudentRequest,
  UnenrollStudentRequest,
  CourseEnrollment,
  CourseProgress,
} from "../types/course.types";
import { PaginatedResponse } from "../types/api.types";
import { NotificationService } from "./notification.service";

export class CourseService {
  /**
   * Create a new course (Admin only)
   */
  static async createCourse(
    data: CreateCourseRequest
  ): Promise<CourseWithDetails> {
    try {
      const course = await prisma.course.create({
        data: {
          title: data.title.trim(),
          description: data.description?.trim(),
          ...(data.teacherId && { teacherId: data.teacherId }),
        },
        include: {
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
              enrollments: true,
              sections: true,
            },
          },
        },
      });

      return course as CourseWithDetails;
    } catch (error) {
      console.error("Create course error:", error);
      throw error;
    }
  }

  /**
   * Get course by ID with full details
   */
  static async getCourseById(
    courseId: string,
    userId?: string
  ): Promise<CourseWithDetails> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
                ...(userId && {
                  include: {
                    completions: {
                      where: {
                        student: {
                          userId: userId,
                        },
                      },
                      select: {
                        completed: true,
                        createdAt: true,
                      },
                    },
                  },
                }),
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
              enrollments: true,
              sections: true,
            },
          },
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      return course as CourseWithDetails;
    } catch (error) {
      console.error("Get course by ID error:", error);
      throw error;
    }
  }

  /**
   * Get all courses with pagination and filtering
   */
  static async getAllCourses(
    query: CourseSearchQuery
  ): Promise<PaginatedResponse<CourseListItem>> {
    try {
      const { search, teacherId, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (teacherId) {
        where.teacherId = teacherId;
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            teacher: {
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
            _count: {
              select: {
                enrollments: true,
                sections: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({ where }),
      ]);

      const items: CourseListItem[] = courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        teacher: course.teacher,
        enrollmentCount: course._count.enrollments,
        sectionCount: course._count.sections,
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
      console.error("Get all courses error:", error);
      throw error;
    }
  }

  /**
   * Get teacher's assigned courses
   */
  static async getTeacherCourses(teacherId: string): Promise<CourseListItem[]> {
    try {
      const courses = await prisma.course.findMany({
        where: { teacherId },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
          quizzes: {
            include: {
              questions: {
                include: {
                  choices: true,
                },
              },
              attempts: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              sections: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        teacher: course.teacher,
        sections: course.sections,
        enrollments: course.enrollments,
        quizzes: course.quizzes,
        enrollmentCount: course._count.enrollments,
        sectionCount: course._count.sections,
      })) as CourseListItem[];
    } catch (error) {
      console.error("Get teacher courses error:", error);
      throw error;
    }
  }

  /**
   * Update course (Admin or assigned teacher)
   */
  static async updateCourse(
    courseId: string,
    data: UpdateCourseRequest,
    userId: string,
    userRole: Role
  ): Promise<CourseWithDetails> {
    try {
      // Check if course exists and user has permission
      const existingCourse = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!existingCourse) {
        throw new Error("Course not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        existingCourse.teacher?.user.id !== userId
      ) {
        throw new Error("Insufficient permissions to update this course");
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...(data.title && { title: data.title.trim() }),
          ...(data.description !== undefined && {
            description: data.description?.trim(),
          }),
        },
        include: {
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
              enrollments: true,
              sections: true,
            },
          },
        },
      });

      return updatedCourse as CourseWithDetails;
    } catch (error) {
      console.error("Update course error:", error);
      throw error;
    }
  }

  /**
   * Delete course (Admin only)
   */
  static async deleteCourse(courseId: string): Promise<void> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          enrollments: true,
          sections: {
            include: {
              lessons: true,
            },
          },
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if course has enrollments
      if (course.enrollments.length > 0) {
        throw new Error("Cannot delete course with active enrollments");
      }

      await prisma.course.delete({
        where: { id: courseId },
      });
    } catch (error) {
      console.error("Delete course error:", error);
      throw error;
    }
  }

  /**
   * Assign teacher to course (Admin only)
   */
  static async assignTeacherToCourse(
    data: AssignTeacherRequest
  ): Promise<CourseWithDetails> {
    try {
      const { courseId, teacherId } = data;

      // Verify teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Verify course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { teacherId },
        include: {
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
              enrollments: true,
              sections: true,
            },
          },
        },
      });

      return updatedCourse as CourseWithDetails;
    } catch (error) {
      console.error("Assign teacher to course error:", error);
      throw error;
    }
  }

  /**
   * Remove teacher from course (Admin only)
   */
  static async removeTeacherFromCourse(
    courseId: string
  ): Promise<CourseWithDetails> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: { teacherId: null },
        include: {
          teacher: {
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
          sections: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
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
              enrollments: true,
              sections: true,
            },
          },
        },
      });

      return updatedCourse as CourseWithDetails;
    } catch (error) {
      console.error("Remove teacher from course error:", error);
      throw error;
    }
  }

  // Section Management Methods

  /**
   * Create section in course
   */
  static async createSection(
    data: CreateSectionRequest,
    userId: string,
    userRole: Role
  ): Promise<SectionWithLessons> {
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
        throw new Error("Course not found");
      }

      // Check permissions
      if (userRole !== Role.ADMIN && course.teacher?.user.id !== userId) {
        throw new Error(
          "Insufficient permissions to create section in this course"
        );
      }

      // Get next order number
      const lastSection = await prisma.section.findFirst({
        where: { courseId: data.courseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const nextOrder = data.order ?? (lastSection ? lastSection.order + 1 : 1);

      const section = await prisma.section.create({
        data: {
          title: data.title.trim(),
          order: nextOrder,
          courseId: data.courseId,
        },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return section as SectionWithLessons;
    } catch (error) {
      console.error("Create section error:", error);
      throw error;
    }
  }

  /**
   * Update section
   */
  static async updateSection(
    sectionId: string,
    data: UpdateSectionRequest,
    userId: string,
    userRole: Role
  ): Promise<SectionWithLessons> {
    try {
      // Check section and course permissions
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
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

      if (!section) {
        throw new Error("Section not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        section.course.teacher?.user.id !== userId
      ) {
        throw new Error("Insufficient permissions to update this section");
      }

      const updatedSection = await prisma.section.update({
        where: { id: sectionId },
        data: {
          ...(data.title && { title: data.title.trim() }),
          ...(data.order !== undefined && { order: data.order }),
        },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return updatedSection as SectionWithLessons;
    } catch (error) {
      console.error("Update section error:", error);
      throw error;
    }
  }

  /**
   * Delete section
   */
  static async deleteSection(
    sectionId: string,
    userId: string,
    userRole: Role
  ): Promise<void> {
    try {
      // Check section and course permissions
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
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
          lessons: true,
        },
      });

      if (!section) {
        throw new Error("Section not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        section.course.teacher?.user.id !== userId
      ) {
        throw new Error("Insufficient permissions to delete this section");
      }

      // Check if section has lessons
      if (section.lessons.length > 0) {
        throw new Error(
          "Cannot delete section with lessons. Delete lessons first."
        );
      }

      await prisma.section.delete({
        where: { id: sectionId },
      });
    } catch (error) {
      console.error("Delete section error:", error);
      throw error;
    }
  }

  // Lesson Management Methods

  /**
   * Create lesson in section
   */
  static async createLesson(
    data: CreateLessonRequest,
    userId: string,
    userRole: Role
  ): Promise<LessonWithDetails> {
    try {
      // Check section and course permissions
      const section = await prisma.section.findUnique({
        where: { id: data.sectionId },
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

      if (!section) {
        throw new Error("Section not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        section.course.teacher?.user.id !== userId
      ) {
        throw new Error(
          "Insufficient permissions to create lesson in this section"
        );
      }

      // Get next order number
      const lastLesson = await prisma.lesson.findFirst({
        where: { sectionId: data.sectionId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const nextOrder = data.order ?? (lastLesson ? lastLesson.order + 1 : 1);

      const lesson = await prisma.lesson.create({
        data: {
          title: data.title.trim(),
          content: data.content?.trim(),
          videoUrl: data.videoUrl?.trim(),
          pdfUrl: data.pdfUrl?.trim(),
          order: nextOrder,
          sectionId: data.sectionId,
        },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          completions: true,
        },
      });

      return lesson as LessonWithDetails;
    } catch (error) {
      console.error("Create lesson error:", error);
      throw error;
    }
  }

  /**
   * Update lesson
   */
  static async updateLesson(
    lessonId: string,
    data: UpdateLessonRequest,
    userId: string,
    userRole: Role
  ): Promise<LessonWithDetails> {
    try {
      // Check lesson, section and course permissions
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
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

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        lesson.section.course.teacher?.user.id !== userId
      ) {
        throw new Error("Insufficient permissions to update this lesson");
      }

      const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          ...(data.title && { title: data.title.trim() }),
          ...(data.content !== undefined && { content: data.content?.trim() }),
          ...(data.videoUrl !== undefined && {
            videoUrl: data.videoUrl?.trim(),
          }),
          ...(data.pdfUrl !== undefined && { pdfUrl: data.pdfUrl?.trim() }),
          ...(data.order !== undefined && { order: data.order }),
        },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          completions: true,
        },
      });

      return updatedLesson as LessonWithDetails;
    } catch (error) {
      console.error("Update lesson error:", error);
      throw error;
    }
  }

  /**
   * Delete lesson
   */
  static async deleteLesson(
    lessonId: string,
    userId: string,
    userRole: Role
  ): Promise<void> {
    try {
      // Check lesson, section and course permissions
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
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
          completions: true,
        },
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check permissions
      if (
        userRole !== Role.ADMIN &&
        lesson.section.course.teacher?.user.id !== userId
      ) {
        throw new Error("Insufficient permissions to delete this lesson");
      }

      await prisma.lesson.delete({
        where: { id: lessonId },
      });
    } catch (error) {
      console.error("Delete lesson error:", error);
      throw error;
    }
  }

  // Enrollment Management Methods

  /**
   * Enroll student in course
   */
  static async enrollStudent(
    data: EnrollStudentRequest
  ): Promise<CourseEnrollment> {
    try {
      const { courseId, studentId } = data;

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });

      return enrollment as CourseEnrollment;
    } catch (error) {
      console.error("Enroll student error:", error);
      throw error;
    }
  }

  /**
   * Unenroll student from course
   */
  static async unenrollStudent(data: UnenrollStudentRequest): Promise<void> {
    try {
      const { courseId, studentId } = data;

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Delete enrollment and related completions
      await prisma.$transaction([
        prisma.completion.deleteMany({
          where: {
            studentId,
            lesson: {
              section: {
                courseId,
              },
            },
          },
        }),
        prisma.enrollment.delete({
          where: {
            studentId_courseId: {
              studentId,
              courseId,
            },
          },
        }),
      ]);
    } catch (error) {
      console.error("Unenroll student error:", error);
      throw error;
    }
  }

  /**
   * Get course enrollments
   */
  static async getCourseEnrollments(
    courseId: string
  ): Promise<CourseEnrollment[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return enrollments as CourseEnrollment[];
    } catch (error) {
      console.error("Get course enrollments error:", error);
      throw error;
    }
  }

  /**
   * Get student enrollments
   */
  static async getStudentEnrollments(
    studentId: string
  ): Promise<CourseEnrollment[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
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
          course: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return enrollments as CourseEnrollment[];
    } catch (error) {
      console.error("Get student enrollments error:", error);
      throw error;
    }
  }

  /**
   * Get course progress for student
   */
  static async getCourseProgress(
    courseId: string,
    studentId: string
  ): Promise<CourseProgress> {
    try {
      // Get course with sections and lessons
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          sections: {
            include: {
              lessons: {
                include: {
                  completions: {
                    where: { studentId },
                    select: {
                      completed: true,
                      createdAt: true,
                    },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if student is enrolled
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Calculate progress
      let totalLessons = 0;
      let completedLessons = 0;

      const sectionsWithProgress = course.sections.map((section) => {
        const lessonsWithProgress = section.lessons.map((lesson) => {
          totalLessons++;
          const completion = lesson.completions[0];
          const isCompleted = completion?.completed || false;

          if (isCompleted) {
            completedLessons++;
          }

          return {
            id: lesson.id,
            title: lesson.title,
            order: lesson.order,
            completed: isCompleted,
            completedAt: completion?.createdAt,
          };
        });

        return {
          id: section.id,
          title: section.title,
          order: section.order,
          lessons: lessonsWithProgress,
        };
      });

      const progressPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        studentId,
        totalLessons,
        completedLessons,
        progressPercentage,
        sections: sectionsWithProgress,
        enrolledAt: enrollment.createdAt,
      };
    } catch (error) {
      console.error("Get course progress error:", error);
      throw error;
    }
  }

  /**
   * Check if student is enrolled in course
   */
  static async isStudentEnrolled(
    courseId: string,
    studentId: string
  ): Promise<boolean> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      return !!enrollment;
    } catch (error) {
      console.error("Check student enrollment error:", error);
      return false;
    }
  }

  /**
   * Get available courses for student (not enrolled)
   */
  static async getAvailableCoursesForStudent(
    studentId: string
  ): Promise<CourseListItem[]> {
    try {
      const courses = await prisma.course.findMany({
        where: {
          enrollments: {
            none: {
              studentId,
            },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
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
          _count: {
            select: {
              enrollments: true,
              sections: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        teacher: course.teacher,
        enrollmentCount: course._count.enrollments,
        sectionCount: course._count.sections,
      }));
    } catch (error) {
      console.error("Get available courses for student error:", error);
      throw error;
    }
  }

  // Lesson Completion Methods

  /**
   * Mark lesson as completed for student
   */
  static async markLessonComplete(
    lessonId: string,
    studentId: string
  ): Promise<void> {
    try {
      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check if student is enrolled in the course
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: lesson.section.course.id,
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Create or update completion record
      await prisma.completion.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
        update: {
          completed: true,
          updatedAt: new Date(),
        },
        create: {
          studentId,
          lessonId,
          completed: true,
        },
      });
    } catch (error) {
      console.error("Mark lesson complete error:", error);
      throw error;
    }
  }

  /**
   * Mark lesson as incomplete for student
   */
  static async markLessonIncomplete(
    lessonId: string,
    studentId: string
  ): Promise<void> {
    try {
      // Check if lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Check if student is enrolled in the course
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: lesson.section.course.id,
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Update completion record
      await prisma.completion.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
        update: {
          completed: false,
          updatedAt: new Date(),
        },
        create: {
          studentId,
          lessonId,
          completed: false,
        },
      });
    } catch (error) {
      console.error("Mark lesson incomplete error:", error);
      throw error;
    }
  }

  /**
   * Get lesson completion status for student
   */
  static async getLessonCompletion(
    lessonId: string,
    studentId: string
  ): Promise<{ completed: boolean; completedAt?: Date }> {
    try {
      const completion = await prisma.completion.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
      });

      return {
        completed: completion?.completed || false,
        completedAt: completion?.completed ? completion.createdAt : undefined,
      };
    } catch (error) {
      console.error("Get lesson completion error:", error);
      throw error;
    }
  }

  // Bulk Operations

  /**
   * Bulk enroll students in course
   */
  static async bulkEnrollStudents(
    courseId: string,
    studentIds: string[]
  ): Promise<{
    successful: string[];
    failed: { studentId: string; error: string }[];
  }> {
    try {
      const successful: string[] = [];
      const failed: { studentId: string; error: string }[] = [];

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      for (const studentId of studentIds) {
        try {
          await this.enrollStudent({ courseId, studentId });
          successful.push(studentId);
        } catch (error) {
          failed.push({
            studentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return { successful, failed };
    } catch (error) {
      console.error("Bulk enroll students error:", error);
      throw error;
    }
  }

  /**
   * Bulk unenroll students from course
   */
  static async bulkUnenrollStudents(
    courseId: string,
    studentIds: string[]
  ): Promise<{
    successful: string[];
    failed: { studentId: string; error: string }[];
  }> {
    try {
      const successful: string[] = [];
      const failed: { studentId: string; error: string }[] = [];

      for (const studentId of studentIds) {
        try {
          await this.unenrollStudent({ courseId, studentId });
          successful.push(studentId);
        } catch (error) {
          failed.push({
            studentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return { successful, failed };
    } catch (error) {
      console.error("Bulk unenroll students error:", error);
      throw error;
    }
  }

  /**
   * Get courses by teacher ID
   */
  static async getCoursesByTeacher(
    teacherId: string
  ): Promise<CourseListItem[]> {
    try {
      const courses = await prisma.course.findMany({
        where: { teacherId },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
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
          _count: {
            select: {
              enrollments: true,
              sections: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        teacher: course.teacher,
        enrollmentCount: course._count.enrollments,
        sectionCount: course._count.sections,
      }));
    } catch (error) {
      console.error("Get courses by teacher error:", error);
      throw error;
    }
  }

  // Enrollment Request Methods

  /**
   * Create enrollment request
   */
  static async createEnrollmentRequest(data: {
    studentId: string;
    courseId: string;
    message?: string;
  }) {
    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        include: { user: true },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: data.studentId,
            courseId: data.courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      // Check if request already exists
      const existingRequest = await prisma.enrollmentRequest.findUnique({
        where: {
          studentId_courseId: {
            studentId: data.studentId,
            courseId: data.courseId,
          },
        },
      });

      if (existingRequest) {
        if (existingRequest.status === "PENDING") {
          throw new Error("Enrollment request is already pending");
        } else if (existingRequest.status === "APPROVED") {
          throw new Error("Enrollment request was already approved");
        } else {
          // If rejected, allow new request by updating existing one
          const updatedRequest = await prisma.enrollmentRequest.update({
            where: { id: existingRequest.id },
            data: {
              status: "PENDING",
              message: data.message,
              adminNote: null,
              reviewedBy: null,
              reviewedAt: null,
              updatedAt: new Date(),
            },
            include: {
              student: {
                include: { user: true },
              },
              course: true,
            },
          });
          return updatedRequest;
        }
      }

      // Create new enrollment request
      const enrollmentRequest = await prisma.enrollmentRequest.create({
        data: {
          studentId: data.studentId,
          courseId: data.courseId,
          message: data.message,
          status: "PENDING",
        },
        include: {
          student: {
            include: { user: true },
          },
          course: true,
        },
      });

      return enrollmentRequest;
    } catch (error) {
      console.error("Create enrollment request error:", error);
      throw error;
    }
  }

  /**
   * Get enrollment requests (Admin only)
   */
  static async getEnrollmentRequests(filters?: {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    courseId?: string;
    studentId?: string;
  }) {
    try {
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.courseId) {
        where.courseId = filters.courseId;
      }
      if (filters?.studentId) {
        where.studentId = filters.studentId;
      }

      const requests = await prisma.enrollmentRequest.findMany({
        where,
        include: {
          student: {
            include: { user: true },
          },
          course: {
            include: {
              teacher: {
                include: { user: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return requests;
    } catch (error) {
      console.error("Get enrollment requests error:", error);
      throw error;
    }
  }

  /**
   * Get student's enrollment requests
   */
  static async getStudentEnrollmentRequests(studentId: string) {
    try {
      const requests = await prisma.enrollmentRequest.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              teacher: {
                include: { user: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return requests;
    } catch (error) {
      console.error("Get student enrollment requests error:", error);
      throw error;
    }
  }

  /**
   * Review enrollment request (Admin only)
   */
  static async reviewEnrollmentRequest(data: {
    requestId: string;
    status: "APPROVED" | "REJECTED";
    adminNote?: string;
    reviewedBy: string;
  }) {
    try {
      // Get the request
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: data.requestId },
        include: {
          student: true,
          course: true,
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      if (request.status !== "PENDING") {
        throw new Error("Request has already been reviewed");
      }

      // Update request status
      const updatedRequest = await prisma.enrollmentRequest.update({
        where: { id: data.requestId },
        data: {
          status: data.status,
          adminNote: data.adminNote,
          reviewedBy: data.reviewedBy,
          reviewedAt: new Date(),
        },
        include: {
          student: {
            include: { user: true },
          },
          course: true,
        },
      });

      // If approved, create enrollment
      if (data.status === "APPROVED") {
        await prisma.enrollment.create({
          data: {
            studentId: request.studentId,
            courseId: request.courseId,
          },
        });
      }

      // Create notification for enrollment status change
      try {
        await NotificationService.createEnrollmentNotification(
          updatedRequest.student.userId,
          updatedRequest.course.title,
          data.status === "APPROVED" ? "approved" : "rejected",
          data.adminNote
        );
        console.log(
          "✅ Enrollment notification created for user:",
          updatedRequest.student.userId
        );
      } catch (notificationError) {
        console.error(
          "⚠️ Failed to create enrollment notification:",
          notificationError
        );
        // Don't throw error here, enrollment process should continue even if notification fails
      }

      return updatedRequest;
    } catch (error) {
      console.error("Review enrollment request error:", error);
      throw error;
    }
  }

  /**
   * Get enrollment request by ID
   */
  static async getEnrollmentRequestById(requestId: string) {
    try {
      const request = await prisma.enrollmentRequest.findUnique({
        where: { id: requestId },
        include: {
          student: {
            include: { user: true },
          },
          course: {
            include: {
              teacher: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!request) {
        throw new Error("Enrollment request not found");
      }

      return request;
    } catch (error) {
      console.error("Get enrollment request by ID error:", error);
      throw error;
    }
  }
}
