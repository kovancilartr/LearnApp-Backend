import { prisma } from "../config/database";
import { Role } from "@prisma/client";
import {
  CourseProgress,
  LessonProgress,
  SectionProgress,
} from "../types/course.types";

export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalCourses: number;
  totalLessonsCompleted: number;
  totalLessonsAvailable: number;
  overallProgressPercentage: number;
  courseProgresses: CourseProgress[];
}

export interface ParentProgressView {
  childId: string;
  childName: string;
  childEmail: string;
  progressSummary: StudentProgressSummary;
}

export interface LessonCompletionRequest {
  lessonId: string;
  studentId: string;
  completed: boolean;
}

export interface TeacherProgressOverview {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  averageProgress: number;
  studentsProgress: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
  }[];
}

export interface ProgressCalculationResult {
  courseId: string;
  studentId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  sectionProgress: {
    sectionId: string;
    sectionTitle: string;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  }[];
  lastActivity: Date | null;
  estimatedCompletionDate: Date | null;
  averageLessonsPerWeek: number;
}

export interface BulkProgressCalculation {
  studentId: string;
  courses: ProgressCalculationResult[];
  overallStats: {
    totalCourses: number;
    totalLessons: number;
    totalCompletedLessons: number;
    overallProgressPercentage: number;
    averageProgressPerCourse: number;
    mostActiveWeek: string | null;
    leastActiveWeek: string | null;
  };
}

export class ProgressService {
  /**
   * Mark lesson as completed/uncompleted for student with enhanced validation and security
   * Supports toggle functionality with detailed timestamp tracking
   */
  static async updateLessonCompletion(data: LessonCompletionRequest): Promise<{
    lessonId: string;
    studentId: string;
    completed: boolean;
    completedAt: Date | null;
    previousStatus: boolean;
    toggleAction: "completed" | "uncompleted" | "unchanged";
    firstCompletedAt: Date | null;
    lastModifiedAt: Date;
    courseProgress: {
      courseId: string;
      completedLessons: number;
      totalLessons: number;
      progressPercentage: number;
    };
  }> {
    try {
      const { lessonId, studentId, completed } = data;

      // Enhanced input validation
      if (!lessonId || typeof lessonId !== "string" || lessonId.trim() === "") {
        throw new Error("Valid lesson ID is required");
      }

      if (
        !studentId ||
        typeof studentId !== "string" ||
        studentId.trim() === ""
      ) {
        throw new Error("Valid student ID is required");
      }

      if (typeof completed !== "boolean") {
        throw new Error("Completion status must be a boolean value");
      }

      // Verify student exists and is active
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: { id: true, role: true, name: true, email: true },
          },
        },
      });

      if (!student) {
        throw new Error("Student not found or inactive");
      }

      // Verify lesson exists and get complete course information
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  teacherId: true,
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new Error("Lesson not found or has been deleted");
      }

      // Enhanced security check: Verify student is enrolled in the course
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: lesson.section.course.id,
          },
        },
      });

      if (!enrollment) {
        throw new Error(
          "Access denied: Student is not enrolled in this course"
        );
      }

      // Get current completion status for detailed comparison
      const currentCompletion = await prisma.completion.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
      });

      const previousStatus = currentCompletion?.completed || false;
      const firstCompletedAt = currentCompletion?.createdAt || null;

      // Determine toggle action
      let toggleAction: "completed" | "uncompleted" | "unchanged";
      if (previousStatus === completed) {
        toggleAction = "unchanged";
      } else if (completed) {
        toggleAction = "completed";
      } else {
        toggleAction = "uncompleted";
      }

      // Update or create completion record with enhanced timestamp handling
      const now = new Date();
      const updatedCompletion = await prisma.completion.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
        update: {
          completed,
          updatedAt: now,
        },
        create: {
          studentId,
          lessonId,
          completed,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Calculate updated course progress for immediate feedback
      const courseProgress = await this.calculateCourseProgressPercentage(
        lesson.section.course.id,
        studentId
      );

      return {
        lessonId,
        studentId,
        completed: updatedCompletion.completed,
        completedAt: updatedCompletion.completed
          ? updatedCompletion.updatedAt
          : null,
        previousStatus,
        toggleAction,
        firstCompletedAt: updatedCompletion.completed
          ? firstCompletedAt || updatedCompletion.createdAt
          : null,
        lastModifiedAt: updatedCompletion.updatedAt,
        courseProgress,
      };
    } catch (error) {
      console.error("Update lesson completion error:", error);
      throw error;
    }
  }

  /**
   * Get detailed course progress for a student
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
                      updatedAt: true,
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

      const sectionsWithProgress: SectionProgress[] = course.sections.map(
        (section) => {
          const lessonsWithProgress: LessonProgress[] = section.lessons.map(
            (lesson) => {
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
                completedAt: completion?.updatedAt || completion?.createdAt,
              };
            }
          );

          return {
            id: section.id,
            title: section.title,
            order: section.order,
            lessons: lessonsWithProgress,
          };
        }
      );

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
   * Get all course progresses for a student
   */
  static async getStudentProgressSummary(
    studentId: string
  ): Promise<StudentProgressSummary> {
    try {
      // Get student info
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Get progress for each enrolled course
      const courseProgresses: CourseProgress[] = [];
      let totalLessonsCompleted = 0;
      let totalLessonsAvailable = 0;

      for (const enrollment of student.enrollments) {
        const courseProgress = await this.getCourseProgress(
          enrollment.course.id,
          studentId
        );
        courseProgresses.push(courseProgress);
        totalLessonsCompleted += courseProgress.completedLessons;
        totalLessonsAvailable += courseProgress.totalLessons;
      }

      const overallProgressPercentage =
        totalLessonsAvailable > 0
          ? Math.round((totalLessonsCompleted / totalLessonsAvailable) * 100)
          : 0;

      return {
        studentId: student.id,
        studentName: student.user.name,
        studentEmail: student.user.email,
        totalCourses: student.enrollments.length,
        totalLessonsCompleted,
        totalLessonsAvailable,
        overallProgressPercentage,
        courseProgresses,
      };
    } catch (error) {
      console.error("Get student progress summary error:", error);
      throw error;
    }
  }

  /**
   * Get progress view for parent (all children)
   */
  static async getParentProgressView(
    parentId: string
  ): Promise<ParentProgressView[]> {
    try {
      // Get parent with children
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          children: {
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
      });

      if (!parent) {
        throw new Error("Parent not found");
      }

      // Get progress for each child
      const childrenProgress: ParentProgressView[] = [];

      for (const child of parent.children) {
        const progressSummary = await this.getStudentProgressSummary(child.id);

        childrenProgress.push({
          childId: child.id,
          childName: child.user.name,
          childEmail: child.user.email,
          progressSummary,
        });
      }

      return childrenProgress;
    } catch (error) {
      console.error("Get parent progress view error:", error);
      throw error;
    }
  }

  /**
   * Get progress overview for teacher's courses
   */
  static async getTeacherProgressOverview(
    teacherId: string
  ): Promise<TeacherProgressOverview[]> {
    try {
      // Get teacher's courses
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          courses: {
            include: {
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
              sections: {
                include: {
                  lessons: true,
                },
              },
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const courseOverviews: TeacherProgressOverview[] = [];

      for (const course of teacher.courses) {
        // Calculate total lessons in course
        const totalLessons = course.sections.reduce(
          (total, section) => total + section.lessons.length,
          0
        );

        // Get progress for each enrolled student
        const studentsProgress = [];
        let totalProgressSum = 0;

        for (const enrollment of course.enrollments) {
          const studentProgress = await this.getCourseProgress(
            course.id,
            enrollment.student.id
          );

          studentsProgress.push({
            studentId: enrollment.student.id,
            studentName: enrollment.student.user.name,
            studentEmail: enrollment.student.user.email,
            progressPercentage: studentProgress.progressPercentage,
            completedLessons: studentProgress.completedLessons,
            totalLessons: studentProgress.totalLessons,
          });

          totalProgressSum += studentProgress.progressPercentage;
        }

        const averageProgress =
          course.enrollments.length > 0
            ? Math.round(totalProgressSum / course.enrollments.length)
            : 0;

        courseOverviews.push({
          courseId: course.id,
          courseTitle: course.title,
          totalStudents: course.enrollments.length,
          averageProgress,
          studentsProgress,
        });
      }

      return courseOverviews;
    } catch (error) {
      console.error("Get teacher progress overview error:", error);
      throw error;
    }
  }

  /**
   * Get lesson completion status for student
   */
  static async getLessonCompletionStatus(
    lessonId: string,
    studentId: string
  ): Promise<boolean> {
    try {
      const completion = await prisma.completion.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
      });

      return completion?.completed || false;
    } catch (error) {
      console.error("Get lesson completion status error:", error);
      return false;
    }
  }

  /**
   * Get course completion statistics
   */
  static async getCourseCompletionStats(courseId: string): Promise<{
    totalStudents: number;
    studentsCompleted: number;
    completionRate: number;
    averageProgress: number;
  }> {
    try {
      // Get all enrollments for the course
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: {
          student: true,
        },
      });

      if (enrollments.length === 0) {
        return {
          totalStudents: 0,
          studentsCompleted: 0,
          completionRate: 0,
          averageProgress: 0,
        };
      }

      let totalProgress = 0;
      let studentsCompleted = 0;

      // Calculate progress for each student
      for (const enrollment of enrollments) {
        const progress = await this.getCourseProgress(
          courseId,
          enrollment.student.id
        );
        totalProgress += progress.progressPercentage;

        if (progress.progressPercentage === 100) {
          studentsCompleted++;
        }
      }

      const averageProgress = Math.round(totalProgress / enrollments.length);
      const completionRate = Math.round(
        (studentsCompleted / enrollments.length) * 100
      );

      return {
        totalStudents: enrollments.length,
        studentsCompleted,
        completionRate,
        averageProgress,
      };
    } catch (error) {
      console.error("Get course completion stats error:", error);
      throw error;
    }
  }

  /**
   * Get recent lesson completions for student
   */
  static async getRecentCompletions(
    studentId: string,
    limit: number = 10
  ): Promise<
    {
      lessonId: string;
      lessonTitle: string;
      courseId: string;
      courseTitle: string;
      sectionTitle: string;
      completedAt: Date;
    }[]
  > {
    try {
      const completions = await prisma.completion.findMany({
        where: {
          studentId,
          completed: true,
        },
        include: {
          lesson: {
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
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: limit,
      });

      return completions.map((completion) => ({
        lessonId: completion.lesson.id,
        lessonTitle: completion.lesson.title,
        courseId: completion.lesson.section.course.id,
        courseTitle: completion.lesson.section.course.title,
        sectionTitle: completion.lesson.section.title,
        completedAt: completion.updatedAt,
      }));
    } catch (error) {
      console.error("Get recent completions error:", error);
      throw error;
    }
  }

  /**
   * Calculate detailed course completion percentages with analytics
   */
  static async calculateCourseCompletionAnalytics(
    courseId: string,
    studentId?: string
  ): Promise<{
    courseId: string;
    courseTitle: string;
    totalLessons: number;
    totalSections: number;
    overallStats: {
      totalStudents: number;
      averageCompletionPercentage: number;
      studentsFullyCompleted: number;
      studentsStarted: number;
      studentsNotStarted: number;
    };
    sectionBreakdown: {
      sectionId: string;
      sectionTitle: string;
      sectionOrder: number;
      totalLessons: number;
      averageCompletionPercentage: number;
      lessonsCompleted: number;
    }[];
    studentSpecificData?: {
      studentId: string;
      completedLessons: number;
      completionPercentage: number;
      lastActivityAt: Date | null;
      completionsBySection: {
        sectionId: string;
        completedLessons: number;
        totalLessons: number;
        percentage: number;
      }[];
    };
  }> {
    try {
      // Get course with full structure
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          sections: {
            include: {
              lessons: {
                include: {
                  completions: studentId
                    ? {
                        where: { studentId },
                      }
                    : true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          enrollments: {
            include: {
              student: {
                include: {
                  completions: {
                    where: {
                      lesson: {
                        section: {
                          courseId,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      const totalLessons = course.sections.reduce(
        (total, section) => total + section.lessons.length,
        0
      );
      const totalSections = course.sections.length;

      // Calculate overall statistics
      const totalStudents = course.enrollments.length;
      let totalCompletionSum = 0;
      let studentsFullyCompleted = 0;
      let studentsStarted = 0;
      let studentsNotStarted = 0;

      // Calculate per-student completion
      for (const enrollment of course.enrollments) {
        const studentCompletions = enrollment.student.completions.filter(
          (c) => c.completed
        );
        const studentCompletionPercentage =
          totalLessons > 0
            ? (studentCompletions.length / totalLessons) * 100
            : 0;

        totalCompletionSum += studentCompletionPercentage;

        if (studentCompletionPercentage === 100) {
          studentsFullyCompleted++;
        } else if (studentCompletionPercentage > 0) {
          studentsStarted++;
        } else {
          studentsNotStarted++;
        }
      }

      const averageCompletionPercentage =
        totalStudents > 0 ? Math.round(totalCompletionSum / totalStudents) : 0;

      // Calculate section breakdown
      const sectionBreakdown = course.sections.map((section) => {
        const sectionLessons = section.lessons.length;
        let sectionCompletionSum = 0;
        let sectionLessonsCompleted = 0;

        // Calculate completion for this section across all students
        for (const enrollment of course.enrollments) {
          const sectionCompletions = enrollment.student.completions.filter(
            (c) =>
              c.completed &&
              section.lessons.some((lesson) => lesson.id === c.lessonId)
          );
          sectionCompletionSum += sectionCompletions.length;
          sectionLessonsCompleted += sectionCompletions.length;
        }

        const sectionAverageCompletion =
          totalStudents > 0 && sectionLessons > 0
            ? Math.round(
                (sectionCompletionSum / (totalStudents * sectionLessons)) * 100
              )
            : 0;

        return {
          sectionId: section.id,
          sectionTitle: section.title,
          sectionOrder: section.order,
          totalLessons: sectionLessons,
          averageCompletionPercentage: sectionAverageCompletion,
          lessonsCompleted: sectionLessonsCompleted,
        };
      });

      // Student-specific data if requested
      let studentSpecificData;
      if (studentId) {
        const studentCompletions = await prisma.completion.findMany({
          where: {
            studentId,
            lesson: {
              section: {
                courseId,
              },
            },
          },
          include: {
            lesson: {
              include: {
                section: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        const completedLessons = studentCompletions.filter(
          (c) => c.completed
        ).length;
        const completionPercentage =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;
        const lastActivityAt =
          studentCompletions.length > 0
            ? studentCompletions[0].updatedAt
            : null;

        // Calculate completion by section for this student
        const completionsBySection = course.sections.map((section) => {
          const sectionCompletions = studentCompletions.filter(
            (c) => c.completed && c.lesson.section.id === section.id
          );
          const sectionTotalLessons = section.lessons.length;
          const sectionPercentage =
            sectionTotalLessons > 0
              ? Math.round(
                  (sectionCompletions.length / sectionTotalLessons) * 100
                )
              : 0;

          return {
            sectionId: section.id,
            completedLessons: sectionCompletions.length,
            totalLessons: sectionTotalLessons,
            percentage: sectionPercentage,
          };
        });

        studentSpecificData = {
          studentId,
          completedLessons,
          completionPercentage,
          lastActivityAt,
          completionsBySection,
        };
      }

      return {
        courseId: course.id,
        courseTitle: course.title,
        totalLessons,
        totalSections,
        overallStats: {
          totalStudents,
          averageCompletionPercentage,
          studentsFullyCompleted,
          studentsStarted,
          studentsNotStarted,
        },
        sectionBreakdown,
        studentSpecificData,
      };
    } catch (error) {
      console.error("Calculate course completion analytics error:", error);
      throw error;
    }
  }

  /**
   * Calculate course progress percentage for a specific student
   * Enhanced with detailed analytics and validation
   */
  static async calculateCourseProgressPercentage(
    courseId: string,
    studentId: string
  ): Promise<{
    courseId: string;
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  }> {
    try {
      // Input validation
      if (!courseId || !studentId) {
        throw new Error("Course ID and Student ID are required");
      }

      // Verify student is enrolled in the course
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

      // Get all lessons in the course with completion status
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          sections: {
            include: {
              lessons: {
                include: {
                  completions: {
                    where: {
                      studentId,
                      completed: true,
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

      // Calculate totals
      let totalLessons = 0;
      let completedLessons = 0;

      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          totalLessons++;
          if (lesson.completions.length > 0) {
            completedLessons++;
          }
        }
      }

      const progressPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      return {
        courseId,
        completedLessons,
        totalLessons,
        progressPercentage,
      };
    } catch (error) {
      console.error("Calculate course progress percentage error:", error);
      throw error;
    }
  }

  /**
   * Enhanced lesson completion validation with security checks
   */
  static async validateLessonCompletionAccess(
    lessonId: string,
    studentId: string,
    userId: string,
    userRole: string
  ): Promise<{
    isValid: boolean;
    lesson?: any;
    student?: any;
    enrollment?: any;
    errorMessage?: string;
  }> {
    try {
      // Get lesson with course information
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  teacherId: true,
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        return {
          isValid: false,
          errorMessage: "Lesson not found",
        };
      }

      // Get student information
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: { id: true, role: true, name: true },
          },
        },
      });

      if (!student) {
        return {
          isValid: false,
          errorMessage: "Student not found",
        };
      }

      // Check enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: lesson.section.course.id,
          },
        },
      });

      if (!enrollment) {
        return {
          isValid: false,
          errorMessage: "Student is not enrolled in this course",
        };
      }

      // Role-based access validation
      if (userRole === "STUDENT") {
        // Students can only update their own completion
        if (student.user.id !== userId) {
          return {
            isValid: false,
            errorMessage:
              "Students can only update their own lesson completion",
          };
        }
      } else if (userRole === "PARENT") {
        // Parents can update their children's completion
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            children: {
              where: { id: studentId },
            },
          },
        });

        if (!parent || parent.children.length === 0) {
          return {
            isValid: false,
            errorMessage:
              "Parents can only update their children's lesson completion",
          };
        }
      } else if (userRole === "TEACHER") {
        // Teachers can update completion for students in their courses
        if (
          lesson.section.course.teacherId !==
          (await this.getTeacherIdByUserId(userId))
        ) {
          return {
            isValid: false,
            errorMessage:
              "Teachers can only update completion for their assigned courses",
          };
        }
      }
      // Admins can update any completion

      return {
        isValid: true,
        lesson,
        student,
        enrollment,
      };
    } catch (error) {
      console.error("Validate lesson completion access error:", error);
      return {
        isValid: false,
        errorMessage: "Validation failed",
      };
    }
  }

  /**
   * Get teacher ID by user ID helper method
   */
  private static async getTeacherIdByUserId(
    userId: string
  ): Promise<string | null> {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        select: { id: true },
      });
      return teacher?.id || null;
    } catch (error) {
      console.error("Get teacher ID by user ID error:", error);
      return null;
    }
  }

  /**
   * Enhanced parent progress monitoring - Detailed progress reports for parents
   */
  static async getDetailedParentProgressReport(parentId: string): Promise<{
    parentInfo: {
      id: string;
      name: string;
      email: string;
    };
    reportGeneratedAt: Date;
    overallSummary: {
      totalChildren: number;
      totalCourses: number;
      totalLessons: number;
      totalCompletedLessons: number;
      overallProgressPercentage: number;
      averageQuizScore: number;
      totalQuizzesTaken: number;
    };
    childrenReports: {
      childId: string;
      childName: string;
      childEmail: string;
      enrolledAt: Date;
      totalCourses: number;
      completedCourses: number;
      inProgressCourses: number;
      notStartedCourses: number;
      overallProgressPercentage: number;
      totalLessonsCompleted: number;
      totalLessonsAvailable: number;
      averageQuizScore: number;
      totalQuizzesTaken: number;
      recentActivity: {
        lessonId: string;
        lessonTitle: string;
        courseTitle: string;
        completedAt: Date;
        activityType: "lesson_completed" | "quiz_completed";
      }[];
      courseDetails: {
        courseId: string;
        courseTitle: string;
        teacherName: string;
        enrolledAt: Date;
        progressPercentage: number;
        completedLessons: number;
        totalLessons: number;
        lastActivityAt: Date | null;
        estimatedCompletionDate: Date | null;
        quizResults: {
          quizId: string;
          quizTitle: string;
          bestScore: number;
          attemptsCount: number;
          lastAttemptAt: Date;
        }[];
      }[];
      performanceTrends: {
        weeklyProgress: {
          weekStart: Date;
          weekEnd: Date;
          lessonsCompleted: number;
          quizzesTaken: number;
          averageScore: number;
        }[];
        monthlyProgress: {
          month: string;
          year: number;
          lessonsCompleted: number;
          coursesCompleted: number;
          averageScore: number;
        }[];
      };
    }[];
  }> {
    try {
      // Get parent with children and user info
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          children: {
            include: {
              user: {
                select: { id: true, name: true, email: true, createdAt: true },
              },
              enrollments: {
                include: {
                  course: {
                    include: {
                      teacher: {
                        include: {
                          user: {
                            select: { name: true },
                          },
                        },
                      },
                      sections: {
                        include: {
                          lessons: true,
                        },
                      },
                      quizzes: {
                        include: {
                          attempts: {
                            where: { studentId: { in: [] } }, // Will be filled per child
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
              completions: {
                include: {
                  lesson: {
                    include: {
                      section: {
                        include: {
                          course: {
                            select: { id: true, title: true },
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: { updatedAt: "desc" },
              },
              attempts: {
                include: {
                  quiz: {
                    include: {
                      course: {
                        select: { id: true, title: true },
                      },
                    },
                  },
                },
                orderBy: { startedAt: "desc" },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error("Parent not found");
      }

      const reportGeneratedAt = new Date();
      let totalCourses = 0;
      let totalLessons = 0;
      let totalCompletedLessons = 0;
      let totalQuizzesTaken = 0;
      let totalQuizScore = 0;

      const childrenReports = [];

      for (const child of parent.children) {
        const childCourses = child.enrollments.length;
        totalCourses += childCourses;

        let childCompletedCourses = 0;
        let childInProgressCourses = 0;
        let childNotStartedCourses = 0;
        let childTotalLessons = 0;
        let childCompletedLessons = 0;
        let childQuizzesTaken = 0;
        let childTotalQuizScore = 0;

        const courseDetails = [];

        for (const enrollment of child.enrollments) {
          const course = enrollment.course;
          const courseLessons = course.sections.reduce(
            (total, section) => total + section.lessons.length,
            0
          );
          childTotalLessons += courseLessons;

          // Calculate course progress
          const courseCompletions = child.completions.filter(
            (c) =>
              course.sections.some((section) =>
                section.lessons.some((lesson) => lesson.id === c.lessonId)
              ) && c.completed
          );
          const courseCompletedLessons = courseCompletions.length;
          childCompletedLessons += courseCompletedLessons;

          const courseProgressPercentage =
            courseLessons > 0
              ? Math.round((courseCompletedLessons / courseLessons) * 100)
              : 0;

          if (courseProgressPercentage === 100) {
            childCompletedCourses++;
          } else if (courseProgressPercentage > 0) {
            childInProgressCourses++;
          } else {
            childNotStartedCourses++;
          }

          // Get quiz results for this course
          const courseQuizzes = course.quizzes;
          const quizResults = [];

          for (const quiz of courseQuizzes) {
            const quizAttempts = child.attempts.filter(
              (a) => a.quizId === quiz.id && a.finishedAt
            );
            if (quizAttempts.length > 0) {
              const bestScore = Math.max(
                ...quizAttempts.map((a) => a.score || 0)
              );
              const lastAttempt = quizAttempts[0];

              quizResults.push({
                quizId: quiz.id,
                quizTitle: quiz.title,
                bestScore,
                attemptsCount: quizAttempts.length,
                lastAttemptAt: lastAttempt.finishedAt!,
              });

              childQuizzesTaken += quizAttempts.length;
              childTotalQuizScore += quizAttempts.reduce(
                (sum, a) => sum + (a.score || 0),
                0
              );
            }
          }

          // Calculate last activity and estimated completion
          const lastActivity =
            courseCompletions.length > 0
              ? courseCompletions[0].updatedAt
              : null;
          const estimatedCompletionDate = this.calculateEstimatedCompletion(
            courseProgressPercentage,
            courseLessons,
            courseCompletedLessons,
            lastActivity
          );

          courseDetails.push({
            courseId: course.id,
            courseTitle: course.title,
            teacherName: course.teacher?.user.name || "Atanmamış",
            enrolledAt: enrollment.createdAt,
            progressPercentage: courseProgressPercentage,
            completedLessons: courseCompletedLessons,
            totalLessons: courseLessons,
            lastActivityAt: lastActivity,
            estimatedCompletionDate,
            quizResults,
          });
        }

        // Calculate recent activity
        const recentActivity = [];

        // Add recent lesson completions
        const recentLessons = child.completions
          .filter((c) => c.completed)
          .slice(0, 10)
          .map((c) => ({
            lessonId: c.lessonId,
            lessonTitle: c.lesson.title,
            courseTitle: c.lesson.section.course.title,
            completedAt: c.updatedAt,
            activityType: "lesson_completed" as const,
          }));

        // Add recent quiz completions
        const recentQuizzes = child.attempts
          .filter((a) => a.finishedAt)
          .slice(0, 5)
          .map((a) => ({
            lessonId: a.quizId, // Using quizId as lessonId for consistency
            lessonTitle: a.quiz.title,
            courseTitle: a.quiz.course.title,
            completedAt: a.finishedAt!,
            activityType: "quiz_completed" as const,
          }));

        recentActivity.push(...recentLessons, ...recentQuizzes);
        recentActivity.sort(
          (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
        );

        // Calculate performance trends
        const performanceTrends = this.calculatePerformanceTrends(
          child.completions,
          child.attempts
        );

        const childOverallProgress =
          childTotalLessons > 0
            ? Math.round((childCompletedLessons / childTotalLessons) * 100)
            : 0;
        const childAverageQuizScore =
          childQuizzesTaken > 0
            ? Math.round(childTotalQuizScore / childQuizzesTaken)
            : 0;

        childrenReports.push({
          childId: child.id,
          childName: child.user.name,
          childEmail: child.user.email,
          enrolledAt: child.user.createdAt,
          totalCourses: childCourses,
          completedCourses: childCompletedCourses,
          inProgressCourses: childInProgressCourses,
          notStartedCourses: childNotStartedCourses,
          overallProgressPercentage: childOverallProgress,
          totalLessonsCompleted: childCompletedLessons,
          totalLessonsAvailable: childTotalLessons,
          averageQuizScore: childAverageQuizScore,
          totalQuizzesTaken: childQuizzesTaken,
          recentActivity: recentActivity.slice(0, 15),
          courseDetails,
          performanceTrends,
        });

        totalLessons += childTotalLessons;
        totalCompletedLessons += childCompletedLessons;
        totalQuizzesTaken += childQuizzesTaken;
        totalQuizScore += childTotalQuizScore;
      }

      const overallProgressPercentage =
        totalLessons > 0
          ? Math.round((totalCompletedLessons / totalLessons) * 100)
          : 0;
      const averageQuizScore =
        totalQuizzesTaken > 0
          ? Math.round(totalQuizScore / totalQuizzesTaken)
          : 0;

      return {
        parentInfo: {
          id: parent.id,
          name: parent.user.name,
          email: parent.user.email,
        },
        reportGeneratedAt,
        overallSummary: {
          totalChildren: parent.children.length,
          totalCourses,
          totalLessons,
          totalCompletedLessons,
          overallProgressPercentage,
          averageQuizScore,
          totalQuizzesTaken,
        },
        childrenReports,
      };
    } catch (error) {
      console.error("Get detailed parent progress report error:", error);
      throw error;
    }
  }

  /**
   * Progress comparison between children for parents
   */
  static async getChildrenProgressComparison(parentId: string): Promise<{
    comparisonGeneratedAt: Date;
    children: {
      childId: string;
      childName: string;
      metrics: {
        overallProgress: number;
        coursesCompleted: number;
        totalCourses: number;
        averageQuizScore: number;
        lessonsCompletedThisWeek: number;
        lessonsCompletedThisMonth: number;
        streakDays: number;
        lastActivityAt: Date | null;
      };
      rankings: {
        progressRank: number;
        quizScoreRank: number;
        activityRank: number;
        overallRank: number;
      };
    }[];
    insights: {
      topPerformer: string;
      mostImproved: string;
      needsAttention: string[];
      recommendations: string[];
    };
  }> {
    try {
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          children: {
            include: {
              user: { select: { name: true } },
              enrollments: {
                include: {
                  course: {
                    include: {
                      sections: {
                        include: { lessons: true },
                      },
                    },
                  },
                },
              },
              completions: {
                where: { completed: true },
                include: {
                  lesson: true,
                },
                orderBy: { updatedAt: "desc" },
              },
              attempts: {
                where: { finishedAt: { not: null } },
                orderBy: { finishedAt: "desc" },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error("Parent not found");
      }

      const comparisonGeneratedAt = new Date();
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const childrenMetrics: any[] = [];

      for (const child of parent.children) {
        // Calculate total lessons and completed lessons
        const totalLessons = child.enrollments.reduce(
          (total, enrollment) =>
            total +
            enrollment.course.sections.reduce(
              (sectionTotal, section) => sectionTotal + section.lessons.length,
              0
            ),
          0
        );

        const completedLessons = child.completions.length;
        const overallProgress =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        // Calculate completed courses
        const coursesCompleted = child.enrollments.filter((enrollment) => {
          const courseLessons = enrollment.course.sections.reduce(
            (total, section) => total + section.lessons.length,
            0
          );
          const courseCompletions = child.completions.filter((c) =>
            enrollment.course.sections.some((section) =>
              section.lessons.some((lesson) => lesson.id === c.lessonId)
            )
          );
          return (
            courseLessons > 0 && courseCompletions.length === courseLessons
          );
        }).length;

        // Calculate average quiz score
        const quizScores = child.attempts.map((a) => a.score || 0);
        const averageQuizScore =
          quizScores.length > 0
            ? Math.round(
                quizScores.reduce((sum, score) => sum + score, 0) /
                  quizScores.length
              )
            : 0;

        // Calculate recent activity
        const lessonsThisWeek = child.completions.filter(
          (c) => c.updatedAt >= weekAgo
        ).length;
        const lessonsThisMonth = child.completions.filter(
          (c) => c.updatedAt >= monthAgo
        ).length;

        // Calculate streak days
        const streakDays = this.calculateStreakDays(child.completions);

        // Last activity
        const lastActivityAt =
          child.completions.length > 0 ? child.completions[0].updatedAt : null;

        childrenMetrics.push({
          childId: child.id,
          childName: child.user.name,
          metrics: {
            overallProgress,
            coursesCompleted,
            totalCourses: child.enrollments.length,
            averageQuizScore,
            lessonsCompletedThisWeek: lessonsThisWeek,
            lessonsCompletedThisMonth: lessonsThisMonth,
            streakDays,
            lastActivityAt,
          },
        });
      }

      // Calculate rankings
      const childrenWithRankings = childrenMetrics.map((child) => {
        const progressRank =
          childrenMetrics
            .sort(
              (a, b) => b.metrics.overallProgress - a.metrics.overallProgress
            )
            .findIndex((c) => c.childId === child.childId) + 1;

        const quizScoreRank =
          childrenMetrics
            .sort(
              (a, b) => b.metrics.averageQuizScore - a.metrics.averageQuizScore
            )
            .findIndex((c) => c.childId === child.childId) + 1;

        const activityRank =
          childrenMetrics
            .sort(
              (a, b) =>
                b.metrics.lessonsCompletedThisWeek -
                a.metrics.lessonsCompletedThisWeek
            )
            .findIndex((c) => c.childId === child.childId) + 1;

        const overallRank = Math.round(
          (progressRank + quizScoreRank + activityRank) / 3
        );

        return {
          ...child,
          rankings: {
            progressRank,
            quizScoreRank,
            activityRank,
            overallRank,
          },
        };
      });

      // Generate insights
      const topPerformer =
        childrenWithRankings.sort(
          (a, b) => a.rankings.overallRank - b.rankings.overallRank
        )[0]?.childName || "";

      const mostImproved =
        childrenWithRankings.sort(
          (a, b) =>
            b.metrics.lessonsCompletedThisWeek -
            a.metrics.lessonsCompletedThisWeek
        )[0]?.childName || "";

      const needsAttention = childrenWithRankings
        .filter(
          (child) =>
            child.metrics.lessonsCompletedThisWeek === 0 ||
            child.metrics.overallProgress < 20
        )
        .map((child) => child.childName);

      const recommendations =
        this.generateParentRecommendations(childrenWithRankings);

      return {
        comparisonGeneratedAt,
        children: childrenWithRankings,
        insights: {
          topPerformer,
          mostImproved,
          needsAttention,
          recommendations,
        },
      };
    } catch (error) {
      console.error("Get children progress comparison error:", error);
      throw error;
    }
  }

  /**
   * Helper method to calculate estimated completion date
   */
  private static calculateEstimatedCompletion(
    progressPercentage: number,
    totalLessons: number,
    completedLessons: number,
    lastActivity: Date | null
  ): Date | null {
    if (
      !lastActivity ||
      progressPercentage === 0 ||
      progressPercentage === 100
    ) {
      return null;
    }

    const remainingLessons = totalLessons - completedLessons;
    const daysSinceStart = Math.max(
      1,
      Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    );
    const lessonsPerDay = completedLessons / daysSinceStart;

    if (lessonsPerDay <= 0) {
      return null;
    }

    const estimatedDaysToComplete = Math.ceil(remainingLessons / lessonsPerDay);
    return new Date(Date.now() + estimatedDaysToComplete * 24 * 60 * 60 * 1000);
  }

  /**
   * Helper method to calculate performance trends
   */
  private static calculatePerformanceTrends(
    completions: any[],
    attempts: any[]
  ) {
    const now = new Date();
    const weeklyProgress = [];
    const monthlyProgress = [];

    // Calculate weekly progress for last 8 weeks
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(
        now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const weekCompletions = completions.filter(
        (c) => c.updatedAt >= weekStart && c.updatedAt < weekEnd && c.completed
      );

      const weekAttempts = attempts.filter(
        (a) =>
          a.finishedAt && a.finishedAt >= weekStart && a.finishedAt < weekEnd
      );

      const averageScore =
        weekAttempts.length > 0
          ? Math.round(
              weekAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
                weekAttempts.length
            )
          : 0;

      weeklyProgress.unshift({
        weekStart,
        weekEnd,
        lessonsCompleted: weekCompletions.length,
        quizzesTaken: weekAttempts.length,
        averageScore,
      });
    }

    // Calculate monthly progress for last 6 months
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);

      const monthCompletions = completions.filter(
        (c) =>
          c.updatedAt >= monthStart && c.updatedAt <= monthEnd && c.completed
      );

      const monthAttempts = attempts.filter(
        (a) =>
          a.finishedAt && a.finishedAt >= monthStart && a.finishedAt <= monthEnd
      );

      const averageScore =
        monthAttempts.length > 0
          ? Math.round(
              monthAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
                monthAttempts.length
            )
          : 0;

      monthlyProgress.unshift({
        month: monthStart.toLocaleString("tr-TR", { month: "long" }),
        year: monthStart.getFullYear(),
        lessonsCompleted: monthCompletions.length,
        coursesCompleted: 0, // This would need more complex calculation
        averageScore,
      });
    }

    return {
      weeklyProgress,
      monthlyProgress,
    };
  }

  /**
   * Helper method to calculate streak days
   */
  private static calculateStreakDays(completions: any[]): number {
    if (completions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streakDays = 0;
    let currentDate = new Date(today);

    while (true) {
      const dayCompletions = completions.filter((c) => {
        const completionDate = new Date(c.updatedAt);
        completionDate.setHours(0, 0, 0, 0);
        return completionDate.getTime() === currentDate.getTime();
      });

      if (dayCompletions.length > 0) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakDays;
  }

  /**
   * Helper method to generate parent recommendations
   */
  private static generateParentRecommendations(children: any[]): string[] {
    const recommendations = [];

    // Check for inactive children
    const inactiveChildren = children.filter(
      (child) => child.metrics.lessonsCompletedThisWeek === 0
    );

    if (inactiveChildren.length > 0) {
      recommendations.push(
        `${inactiveChildren
          .map((c) => c.childName)
          .join(
            ", "
          )} bu hafta hiç ders tamamlamadı. Motivasyon için teşvik edebilirsiniz.`
      );
    }

    // Check for low quiz scores
    const lowScoreChildren = children.filter(
      (child) =>
        child.metrics.averageQuizScore > 0 &&
        child.metrics.averageQuizScore < 60
    );

    if (lowScoreChildren.length > 0) {
      recommendations.push(
        `${lowScoreChildren
          .map((c) => c.childName)
          .join(
            ", "
          )} quiz skorları düşük. Ek çalışma desteği sağlayabilirsiniz.`
      );
    }

    // Encourage top performers
    const topPerformers = children.filter(
      (child) => child.rankings.overallRank <= 2 && children.length > 2
    );

    if (topPerformers.length > 0) {
      recommendations.push(
        `${topPerformers
          .map((c) => c.childName)
          .join(", ")} harika performans gösteriyor! Tebrik etmeyi unutmayın.`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Tüm çocuklarınız düzenli ilerleme kaydediyor. Bu tempoyu sürdürmeleri için destekleyici olmaya devam edin."
      );
    }

    return recommendations;
  }

  /**
   * Enhanced progress calculation service with detailed analytics
   */
  static async calculateDetailedProgressAnalytics(
    courseId: string,
    studentId: string
  ): Promise<ProgressCalculationResult> {
    try {
      // Input validation
      if (!courseId || !studentId) {
        throw new Error("Course ID and Student ID are required");
      }

      // Verify enrollment
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

      // Get course with complete structure and completion data
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          sections: {
            include: {
              lessons: {
                include: {
                  completions: {
                    where: { studentId },
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

      // Calculate overall progress
      let totalLessons = 0;
      let completedLessons = 0;
      let lastActivity: Date | null = null;
      const completionDates: Date[] = [];

      // Calculate section-wise progress
      const sectionProgress = course.sections.map((section) => {
        let sectionTotalLessons = 0;
        let sectionCompletedLessons = 0;

        section.lessons.forEach((lesson) => {
          sectionTotalLessons++;
          totalLessons++;

          const completion = lesson.completions.find((c) => c.completed);
          if (completion) {
            sectionCompletedLessons++;
            completedLessons++;
            completionDates.push(completion.updatedAt);

            if (!lastActivity || completion.updatedAt > lastActivity) {
              lastActivity = completion.updatedAt;
            }
          }
        });

        const sectionProgressPercentage =
          sectionTotalLessons > 0
            ? Math.round((sectionCompletedLessons / sectionTotalLessons) * 100)
            : 0;

        return {
          sectionId: section.id,
          sectionTitle: section.title,
          totalLessons: sectionTotalLessons,
          completedLessons: sectionCompletedLessons,
          progressPercentage: sectionProgressPercentage,
        };
      });

      const progressPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // Calculate average lessons per week and estimated completion
      let averageLessonsPerWeek = 0;
      let estimatedCompletionDate: Date | null = null;

      if (completionDates.length > 1) {
        // Sort completion dates
        completionDates.sort((a, b) => a.getTime() - b.getTime());

        const firstCompletion = completionDates[0];
        const lastCompletion = completionDates[completionDates.length - 1];

        const weeksDiff = Math.max(
          1,
          (lastCompletion.getTime() - firstCompletion.getTime()) /
            (1000 * 60 * 60 * 24 * 7)
        );

        averageLessonsPerWeek = completedLessons / weeksDiff;

        // Estimate completion date if there are remaining lessons
        const remainingLessons = totalLessons - completedLessons;
        if (remainingLessons > 0 && averageLessonsPerWeek > 0) {
          const weeksToComplete = remainingLessons / averageLessonsPerWeek;
          estimatedCompletionDate = new Date();
          estimatedCompletionDate.setDate(
            estimatedCompletionDate.getDate() + weeksToComplete * 7
          );
        }
      }

      return {
        courseId,
        studentId,
        totalLessons,
        completedLessons,
        progressPercentage,
        sectionProgress,
        lastActivity,
        estimatedCompletionDate,
        averageLessonsPerWeek: Math.round(averageLessonsPerWeek * 100) / 100,
      };
    } catch (error) {
      console.error("Calculate detailed progress analytics error:", error);
      throw error;
    }
  }

  /**
   * Bulk progress calculation for multiple courses
   */
  static async calculateBulkProgressAnalytics(
    studentId: string
  ): Promise<BulkProgressCalculation> {
    try {
      // Get all enrollments for the student
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
      });

      if (enrollments.length === 0) {
        return {
          studentId,
          courses: [],
          overallStats: {
            totalCourses: 0,
            totalLessons: 0,
            totalCompletedLessons: 0,
            overallProgressPercentage: 0,
            averageProgressPerCourse: 0,
            mostActiveWeek: null,
            leastActiveWeek: null,
          },
        };
      }

      // Calculate progress for each course
      const courseProgresses: ProgressCalculationResult[] = [];
      let totalLessons = 0;
      let totalCompletedLessons = 0;
      let totalProgressSum = 0;

      for (const enrollment of enrollments) {
        const courseProgress = await this.calculateDetailedProgressAnalytics(
          enrollment.course.id,
          studentId
        );

        courseProgresses.push(courseProgress);
        totalLessons += courseProgress.totalLessons;
        totalCompletedLessons += courseProgress.completedLessons;
        totalProgressSum += courseProgress.progressPercentage;
      }

      const overallProgressPercentage =
        totalLessons > 0
          ? Math.round((totalCompletedLessons / totalLessons) * 100)
          : 0;

      const averageProgressPerCourse =
        enrollments.length > 0
          ? Math.round(totalProgressSum / enrollments.length)
          : 0;

      // Calculate activity patterns (simplified - would need more detailed tracking in production)
      const mostActiveWeek = null; // Would require weekly activity tracking
      const leastActiveWeek = null; // Would require weekly activity tracking

      return {
        studentId,
        courses: courseProgresses,
        overallStats: {
          totalCourses: enrollments.length,
          totalLessons,
          totalCompletedLessons,
          overallProgressPercentage,
          averageProgressPerCourse,
          mostActiveWeek,
          leastActiveWeek,
        },
      };
    } catch (error) {
      console.error("Calculate bulk progress analytics error:", error);
      throw error;
    }
  }

  /**
   * Get lesson completion details with enhanced timestamp tracking
   */
  static async getLessonCompletionDetails(
    lessonId: string,
    studentId: string
  ): Promise<{
    lessonId: string;
    studentId: string;
    completed: boolean;
    completedAt: Date | null;
    firstCompletedAt: Date | null;
    lastModifiedAt: Date | null;
    completionHistory: {
      action: "completed" | "uncompleted";
      timestamp: Date;
    }[];
    lesson: {
      title: string;
      order: number;
      section: {
        title: string;
        course: {
          title: string;
        };
      };
    };
  }> {
    try {
      // Get lesson details
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Get completion record
      const completion = await prisma.completion.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
      });

      // Build completion history (simplified - in a real system, you'd have an audit log)
      const completionHistory: {
        action: "completed" | "uncompleted";
        timestamp: Date;
      }[] = [];

      if (completion) {
        if (completion.completed) {
          completionHistory.push({
            action: "completed",
            timestamp: completion.updatedAt,
          });
        }

        // If createdAt and updatedAt are different, there was a toggle
        if (completion.createdAt.getTime() !== completion.updatedAt.getTime()) {
          completionHistory.unshift({
            action: completion.completed ? "uncompleted" : "completed",
            timestamp: completion.createdAt,
          });
        }
      }

      return {
        lessonId,
        studentId,
        completed: completion?.completed || false,
        completedAt: completion?.completed ? completion.updatedAt : null,
        firstCompletedAt: completion?.completed ? completion.createdAt : null,
        lastModifiedAt: completion?.updatedAt || null,
        completionHistory,
        lesson: {
          title: lesson.title,
          order: lesson.order,
          section: {
            title: lesson.section.title,
            course: {
              title: lesson.section.course.title,
            },
          },
        },
      };
    } catch (error) {
      console.error("Get lesson completion details error:", error);
      throw error;
    }
  }

  /**
   * Export parent progress data in various formats
   */
  static async exportParentProgressData(
    parentId: string,
    format: "json" | "csv" | "pdf",
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    filename: string;
    data: any;
    format: string;
  }> {
    try {
      console.log(
        "📊 ProgressService.exportParentProgressData - parentId:",
        parentId,
        "format:",
        format
      );

      // Get detailed parent progress report
      const progressData = await this.getDetailedParentProgressReport(parentId);

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `parent-progress-report-${timestamp}.${format}`;

      let exportData;

      switch (format) {
        case "json":
          exportData = {
            exportDate: new Date().toISOString(),
            dateRange,
            ...progressData,
          };
          break;

        case "csv":
          // Convert to CSV format
          const csvRows = [];
          csvRows.push([
            "Child Name",
            "Course",
            "Progress %",
            "Completed Lessons",
            "Total Lessons",
            "Quiz Average",
          ]);

          progressData.childrenReports.forEach((child) => {
            child.courseDetails.forEach((course) => {
              csvRows.push([
                child.childName,
                course.courseTitle,
                course.progressPercentage.toString(),
                course.completedLessons.toString(),
                course.totalLessons.toString(),
                child.averageQuizScore?.toString() || "N/A",
              ]);
            });
          });

          exportData = csvRows.map((row) => row.join(",")).join("\n");
          break;

        case "pdf":
          // Return structured data for PDF generation
          exportData = {
            title: "Parent Progress Report",
            generatedAt: new Date().toISOString(),
            dateRange,
            summary: progressData.overallSummary,
            children: progressData.childrenReports,
          };
          break;

        default:
          throw new Error("Unsupported export format");
      }

      return {
        filename,
        data: exportData,
        format,
      };
    } catch (error) {
      console.error(
        "❌ ProgressService.exportParentProgressData error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get parent progress notifications
   */
  static async getParentProgressNotifications(parentId: string): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      childName: string;
      courseName?: string;
      createdAt: Date;
      read: boolean;
    }>;
    unreadCount: number;
  }> {
    try {
      console.log(
        "🔔 ProgressService.getParentProgressNotifications - parentId:",
        parentId
      );

      // Get parent's children
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          children: {
            include: {
              user: true,
              enrollments: {
                include: {
                  course: true,
                },
              },
              completions: {
                include: {
                  lesson: {
                    include: {
                      section: {
                        include: {
                          course: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  updatedAt: "desc",
                },
                take: 10, // Son 10 tamamlama
              },
              attempts: {
                include: {
                  quiz: {
                    include: {
                      course: true,
                    },
                  },
                },
                where: {
                  finishedAt: {
                    not: null,
                  },
                },
                orderBy: {
                  finishedAt: "desc",
                },
                take: 5, // Son 5 quiz denemesi
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error("Parent not found");
      }

      const notifications: any[] = [];

      // Generate notifications from recent activities
      parent.children.forEach((child) => {
        // Lesson completion notifications
        child.completions.forEach((completion) => {
          if (
            completion.completed &&
            completion.updatedAt >
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ) {
            // Son 7 gün
            notifications.push({
              id: `completion-${completion.id}`,
              type: "LESSON_COMPLETED",
              title: "Ders Tamamlandı",
              message: `${child.user.name}, "${completion.lesson.title}" dersini tamamladı.`,
              childName: child.user.name,
              courseName: completion.lesson.section.course.title,
              createdAt: completion.updatedAt,
              read: false,
            });
          }
        });

        // Quiz completion notifications
        child.attempts.forEach((attempt) => {
          if (
            attempt.finishedAt &&
            attempt.finishedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ) {
            // Son 7 gün
            const score = attempt.score || 0;
            const status = score >= 70 ? "başarılı" : "tekrar gerekli";

            notifications.push({
              id: `quiz-${attempt.id}`,
              type: "QUIZ_COMPLETED",
              title: "Quiz Tamamlandı",
              message: `${child.user.name}, "${attempt.quiz.course.title}" kursundaki quiz'i tamamladı. Puan: ${score}% (${status})`,
              childName: child.user.name,
              courseName: attempt.quiz.course.title,
              createdAt: attempt.finishedAt,
              read: false,
            });
          }
        });
      });

      // Sort notifications by date (newest first)
      notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const unreadCount = notifications.filter((n) => !n.read).length;

      return {
        notifications: notifications.slice(0, 20), // Son 20 bildirim
        unreadCount,
      };
    } catch (error) {
      console.error(
        "❌ ProgressService.getParentProgressNotifications error:",
        error
      );
      throw error;
    }
  }
}
