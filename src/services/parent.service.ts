import { prisma } from "../config/database";
import { ProgressService } from "./progress.service";
import {
  ChildProfile,
  ChildProgressReport,
  ParentQuizResult,
  ParentDashboardSummary,
  ChildEnrollmentRequest,
  ChildNotification,
} from "../types/parent.types";

export class ParentService {
  /**
   * Validate parent-child relationship
   */
  private static async validateParentChildRelationship(
    parentUserId: string,
    childId: string
  ): Promise<void> {
    const parent = await prisma.parent.findUnique({
      where: { userId: parentUserId },
      include: {
        children: {
          where: { id: childId },
        },
      },
    });

    if (!parent) {
      throw new Error("Parent profile not found");
    }

    if (parent.children.length === 0) {
      throw new Error("Child does not belong to this parent");
    }
  }

  /**
   * Get all children profiles for a parent
   */
  static async getChildrenProfiles(
    parentUserId: string
  ): Promise<ChildProfile[]> {
    try {
      console.log(
        "🔍 ParentService.getChildrenProfiles - parentUserId:",
        parentUserId
      );

      // Get parent with children
      const parent = await prisma.parent.findUnique({
        where: { userId: parentUserId },
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
              enrollments: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      teacher: {
                        include: {
                          user: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error("Parent profile not found");
      }

      console.log(
        "📊 ParentService.getChildrenProfiles - children count:",
        parent.children.length
      );

      // Build children profiles with progress data
      const childrenProfiles: ChildProfile[] = [];

      for (const child of parent.children) {
        console.log("📊 Processing child:", child.user.name);

        // Get enrolled courses with progress
        const enrolledCourses = [];
        for (const enrollment of child.enrollments) {
          const courseProgress =
            await ProgressService.calculateCourseProgressPercentage(
              enrollment.course.id,
              child.id
            );

          enrolledCourses.push({
            id: enrollment.course.id,
            title: enrollment.course.title,
            description: enrollment.course.description || "",
            enrolledAt: enrollment.createdAt,
            progress: {
              completedLessons: courseProgress.completedLessons,
              totalLessons: courseProgress.totalLessons,
              progressPercentage: courseProgress.progressPercentage,
            },
          });
        }

        // Get recent activity
        const recentActivity = await ProgressService.getRecentCompletions(
          child.id,
          5
        );

        childrenProfiles.push({
          id: child.id,
          userId: child.user.id,
          name: child.user.name,
          email: child.user.email,
          enrolledCourses,
          recentActivity,
        });
      }

      console.log(
        "✅ ParentService.getChildrenProfiles - returning profiles count:",
        childrenProfiles.length
      );
      return childrenProfiles;
    } catch (error) {
      console.error("❌ ParentService.getChildrenProfiles error:", error);
      throw error;
    }
  }

  /**
   * Get detailed progress report for a specific child
   */
  static async getChildProgress(
    parentUserId: string,
    childId: string
  ): Promise<ChildProgressReport> {
    try {
      console.log(
        "🔍 ParentService.getChildProgress - parentUserId:",
        parentUserId,
        "childId:",
        childId
      );

      // Validate parent-child relationship
      await this.validateParentChildRelationship(parentUserId, childId);

      // Get student progress summary
      const progressSummary = await ProgressService.getStudentProgressSummary(
        childId
      );

      // Get detailed course progress with teacher info
      const courseProgress = [];
      for (const course of progressSummary.courseProgresses) {
        // Get course with teacher info
        const courseDetails = await prisma.course.findUnique({
          where: { id: course.courseId },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Get last activity for this course
        const lastActivity = await prisma.completion.findFirst({
          where: {
            studentId: childId,
            lesson: {
              section: {
                courseId: course.courseId,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        courseProgress.push({
          courseId: course.courseId,
          title: course.courseTitle,
          progress: course.progressPercentage,
          lastActivity: lastActivity?.updatedAt || null,
          teacher: courseDetails?.teacher?.user.name || "Atanmamış",
        });
      }

      // Get recent quiz results
      const recentQuizResults = await this.getChildQuizResults(
        parentUserId,
        childId,
        5
      );

      // Calculate completed courses
      const completedCourses = progressSummary.courseProgresses.filter(
        (course) => course.progressPercentage === 100
      ).length;

      // Get upcoming deadlines (placeholder - would need quiz/assignment deadline system)
      const upcomingDeadlines: any[] = [];

      const report: ChildProgressReport = {
        studentId: childId,
        studentName: progressSummary.studentName,
        totalCourses: progressSummary.totalCourses,
        completedCourses,
        overallProgress: progressSummary.overallProgressPercentage,
        courseProgress,
        recentQuizResults: recentQuizResults.slice(0, 5),
        upcomingDeadlines,
      };

      console.log(
        "✅ ParentService.getChildProgress - returning report for:",
        progressSummary.studentName
      );
      return report;
    } catch (error) {
      console.error("❌ ParentService.getChildProgress error:", error);
      throw error;
    }
  }

  /**
   * Get quiz results for a specific child
   */
  static async getChildQuizResults(
    parentUserId: string,
    childId: string,
    limit?: number
  ): Promise<ParentQuizResult[]> {
    try {
      console.log(
        "🔍 ParentService.getChildQuizResults - parentUserId:",
        parentUserId,
        "childId:",
        childId
      );

      // Validate parent-child relationship
      await this.validateParentChildRelationship(parentUserId, childId);

      // Get quiz attempts for the child
      const attempts = await prisma.attempt.findMany({
        where: {
          studentId: childId,
          finishedAt: { not: null },
        },
        include: {
          quiz: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
              questions: {
                include: {
                  choices: true,
                },
                orderBy: { order: "asc" },
              },
            },
          },
          responses: {
            include: {
              question: {
                include: {
                  choices: true,
                },
              },
              choice: true,
            },
          },
        },
        orderBy: {
          finishedAt: "desc",
        },
        ...(limit && { take: limit }),
      });

      console.log(
        "📊 ParentService.getChildQuizResults - attempts found:",
        attempts.length
      );

      // Transform attempts to quiz results
      const quizResults: ParentQuizResult[] = attempts.map((attempt: any) => {
        const answers = attempt.responses.map((response: any) => {
          const correctChoice = response.question.choices.find(
            (choice: any) => choice.correct
          );

          return {
            questionId: response.question.id,
            questionText: response.question.text,
            selectedChoiceId: response.choice.id,
            selectedChoiceText: response.choice.text,
            correctChoiceId: correctChoice?.id || "",
            correctChoiceText: correctChoice?.text || "",
            isCorrect: response.choice.correct,
          };
        });

        const maxScore = attempt.quiz.questions.length;
        const score = attempt.score || 0;
        const percentage =
          maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        // Calculate time spent
        const timeSpent = attempt.finishedAt && attempt.startedAt 
          ? Math.floor((attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 1000)
          : 0;

        return {
          id: attempt.id,
          quizId: attempt.quiz.id,
          quizTitle: attempt.quiz.title,
          courseId: attempt.quiz.course.id,
          courseTitle: attempt.quiz.course.title,
          score,
          maxScore,
          percentage,
          timeSpent,
          completedAt: attempt.finishedAt!,
          answers,
        };
      });

      console.log(
        "✅ ParentService.getChildQuizResults - returning results count:",
        quizResults.length
      );
      return quizResults;
    } catch (error) {
      console.error("❌ ParentService.getChildQuizResults error:", error);
      throw error;
    }
  }

  /**
   * Create enrollment request for child (parent can enroll child to courses)
   */
  static async createEnrollmentRequestForChild(
    parentUserId: string,
    childId: string,
    courseId: string,
    message?: string
  ): Promise<ChildEnrollmentRequest> {
    try {
      console.log(
        "🔍 ParentService.createEnrollmentRequestForChild - parentUserId:",
        parentUserId,
        "childId:",
        childId,
        "courseId:",
        courseId
      );

      // Validate parent-child relationship
      await this.validateParentChildRelationship(parentUserId, childId);

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          title: true,
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Check if child is already enrolled or has pending request
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: childId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Child is already enrolled in this course");
      }

      const existingRequest = await prisma.enrollmentRequest.findFirst({
        where: {
          studentId: childId,
          courseId,
          status: "PENDING",
        },
      });

      if (existingRequest) {
        throw new Error("Enrollment request already exists for this course");
      }

      // Create enrollment request
      const enrollmentRequest = await prisma.enrollmentRequest.create({
        data: {
          studentId: childId,
          courseId,
          message:
            message ||
            `Enrollment request created by parent for ${course.title}`,
          status: "PENDING",
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
      }) as any;

      console.log(
        "✅ ParentService.createEnrollmentRequestForChild - request created:",
        enrollmentRequest.id
      );
      return enrollmentRequest;
    } catch (error) {
      console.error(
        "❌ ParentService.createEnrollmentRequestForChild error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get enrollment requests for all children of a parent
   */
  static async getChildrenEnrollmentRequests(
    parentUserId: string
  ): Promise<ChildEnrollmentRequest[]> {
    try {
      console.log(
        "🔍 ParentService.getChildrenEnrollmentRequests - parentUserId:",
        parentUserId
      );

      // Get parent with children
      const parent = await prisma.parent.findUnique({
        where: { userId: parentUserId },
        include: {
          children: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!parent) {
        throw new Error("Parent profile not found");
      }

      const childIds = parent.children.map((child) => child.id);

      // Get enrollment requests for all children
      const enrollmentRequests = await prisma.enrollmentRequest.findMany({
        where: {
          studentId: {
            in: childIds,
          },
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
        orderBy: {
          createdAt: "desc",
        },
      }) as any[];

      console.log(
        "✅ ParentService.getChildrenEnrollmentRequests - returning requests count:",
        enrollmentRequests.length
      );
      return enrollmentRequests;
    } catch (error) {
      console.error(
        "❌ ParentService.getChildrenEnrollmentRequests error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get child notifications (for parent to see child-related notifications)
   */
  static async getChildNotifications(
    parentUserId: string,
    childId: string,
    limit?: number
  ): Promise<ChildNotification[]> {
    try {
      console.log(
        "🔍 ParentService.getChildNotifications - parentUserId:",
        parentUserId,
        "childId:",
        childId
      );

      // Validate parent-child relationship
      await this.validateParentChildRelationship(parentUserId, childId);

      // Get child's user ID
      const child = await prisma.student.findUnique({
        where: { id: childId },
        select: {
          userId: true,
        },
      });

      if (!child) {
        throw new Error("Child not found");
      }

      // Get notifications for the child
      const notifications = await prisma.notification.findMany({
        where: {
          userId: child.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        ...(limit && { take: limit }),
      });

      console.log(
        "✅ ParentService.getChildNotifications - returning notifications count:",
        notifications.length
      );
      return notifications;
    } catch (error) {
      console.error("❌ ParentService.getChildNotifications error:", error);
      throw error;
    }
  }

  /**
   * Get summary statistics for all children of a parent
   */
  static async getParentDashboardSummary(
    parentUserId: string
  ): Promise<ParentDashboardSummary> {
    try {
      console.log(
        "🔍 ParentService.getParentDashboardSummary - parentUserId:",
        parentUserId
      );

      const childrenProfiles = await this.getChildrenProfiles(parentUserId);

      let totalCourses = 0;
      let totalCompletedCourses = 0;
      let totalProgress = 0;
      const recentActivity: any[] = [];

      for (const child of childrenProfiles) {
        totalCourses += child.enrolledCourses.length;

        for (const course of child.enrolledCourses) {
          if (course.progress.progressPercentage === 100) {
            totalCompletedCourses++;
          }
          totalProgress += course.progress.progressPercentage;
        }

        // Add recent activity for this child
        for (const activity of child.recentActivity.slice(0, 3)) {
          recentActivity.push({
            childName: child.name,
            activityType: "lesson_completed" as const,
            activityTitle: activity.lessonTitle,
            courseTitle: activity.courseTitle,
            timestamp: activity.completedAt,
          });
        }
      }

      const averageProgress =
        totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;

      // Sort recent activity by timestamp
      recentActivity.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      const summary = {
        totalChildren: childrenProfiles.length,
        totalCourses,
        totalCompletedCourses,
        averageProgress,
        recentActivity: recentActivity.slice(0, 10),
        upcomingDeadlines: [], // Placeholder for future deadline system
      };

      console.log(
        "✅ ParentService.getParentDashboardSummary - returning summary"
      );
      return summary;
    } catch (error) {
      console.error("❌ ParentService.getParentDashboardSummary error:", error);
      throw error;
    }
  }
}
