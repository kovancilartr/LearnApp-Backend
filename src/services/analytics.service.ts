import { prisma } from "../config/database";
import { EnrollmentStatus } from "@prisma/client";
import {
  DashboardStats,
  CourseAnalytics,
  UserAnalytics,
  EnrollmentTrends,
  SystemUsageStats,
  TeacherAssignment,
} from "../types/analytics.types";

export class AnalyticsService {
  /**
   * Get comprehensive dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get basic counts
      const [
        totalCourses,
        totalStudents,
        totalTeachers,
        totalParents,
        totalLessons,
        totalQuizzes,
        activeEnrollments,
        pendingRequests
      ] = await Promise.all([
        prisma.course.count(),
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.parent.count(),
        prisma.lesson.count(),
        prisma.quiz.count(),
        prisma.enrollment.count(),
        prisma.enrollmentRequest.count({
          where: { status: EnrollmentStatus.PENDING }
        })
      ]);

      // Calculate monthly growth
      const currentMonth = new Date();
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      const [
        coursesThisMonth,
        coursesLastMonth,
        studentsThisMonth,
        studentsLastMonth,
        enrollmentsThisMonth,
        enrollmentsLastMonth
      ] = await Promise.all([
        prisma.course.count({
          where: { createdAt: { gte: currentMonthStart } }
        }),
        prisma.course.count({
          where: { 
            createdAt: { 
              gte: lastMonth,
              lt: currentMonthStart
            }
          }
        }),
        prisma.student.count({
          where: { 
            user: { createdAt: { gte: currentMonthStart } }
          }
        }),
        prisma.student.count({
          where: { 
            user: { 
              createdAt: { 
                gte: lastMonth,
                lt: currentMonthStart
              }
            }
          }
        }),
        prisma.enrollment.count({
          where: { createdAt: { gte: currentMonthStart } }
        }),
        prisma.enrollment.count({
          where: { 
            createdAt: { 
              gte: lastMonth,
              lt: currentMonthStart
            }
          }
        })
      ]);

      // Calculate growth percentages
      const courseGrowth = coursesLastMonth > 0 
        ? Math.round(((coursesThisMonth - coursesLastMonth) / coursesLastMonth) * 100)
        : 0;
      
      const studentGrowth = studentsLastMonth > 0
        ? Math.round(((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100)
        : 0;
      
      const enrollmentGrowth = enrollmentsLastMonth > 0
        ? Math.round(((enrollmentsThisMonth - enrollmentsLastMonth) / enrollmentsLastMonth) * 100)
        : 0;

      return {
        totalCourses,
        totalStudents,
        totalTeachers,
        totalParents,
        totalLessons,
        totalQuizzes,
        activeEnrollments,
        pendingRequests,
        monthlyGrowth: {
          courses: courseGrowth,
          students: studentGrowth,
          enrollments: enrollmentGrowth,
        },
      };
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      throw error;
    }
  }

  /**
   * Get detailed course analytics
   */
  static async getCourseAnalytics(): Promise<CourseAnalytics[]> {
    try {
      const courses = await prisma.course.findMany({
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
          enrollments: {
            include: {
              student: true,
            },
          },
          sections: {
            include: {
              lessons: {
                include: {
                  completions: {
                    where: {
                      completed: true,
                    },
                  },
                },
              },
            },
          },
          quizzes: true,
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const courseAnalytics: CourseAnalytics[] = courses.map(course => {
        const totalLessons = course.sections.reduce(
          (total, section) => total + section.lessons.length,
          0
        );

        const totalCompletions = course.sections.reduce(
          (total, section) => 
            total + section.lessons.reduce(
              (lessonTotal, lesson) => lessonTotal + lesson.completions.length,
              0
            ),
          0
        );

        const totalPossibleCompletions = totalLessons * course.enrollments.length;
        const completionRate = totalPossibleCompletions > 0 
          ? Math.round((totalCompletions / totalPossibleCompletions) * 100)
          : 0;

        // Calculate average progress per student
        let totalProgress = 0;
        course.enrollments.forEach(enrollment => {
          const studentCompletions = course.sections.reduce(
            (total, section) => 
              total + section.lessons.reduce(
                (lessonTotal, lesson) => 
                  lessonTotal + lesson.completions.filter(
                    completion => completion.studentId === enrollment.studentId
                  ).length,
                0
              ),
            0
          );
          const studentProgress = totalLessons > 0 
            ? (studentCompletions / totalLessons) * 100 
            : 0;
          totalProgress += studentProgress;
        });

        const averageProgress = course.enrollments.length > 0
          ? Math.round(totalProgress / course.enrollments.length)
          : 0;

        return {
          courseId: course.id,
          title: course.title,
          studentCount: course._count.enrollments,
          completionRate,
          averageProgress,
          teacherName: course.teacher?.user.name || null,
          lessonCount: totalLessons,
          quizCount: course.quizzes.length,
          createdAt: course.createdAt,
        };
      });

      return courseAnalytics;
    } catch (error) {
      console.error("Get course analytics error:", error);
      throw error;
    }
  }

  /**
   * Get user analytics and demographics
   */
  static async getUserAnalytics(): Promise<UserAnalytics> {
    try {
      // Get total user count by role
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      });

      const roleStats = {
        ADMIN: 0,
        TEACHER: 0,
        STUDENT: 0,
        PARENT: 0,
      };

      usersByRole.forEach(group => {
        roleStats[group.role] = group._count.role;
      });

      const totalUsers = Object.values(roleStats).reduce((sum, count) => sum + count, 0);

      // Get new users this month
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await prisma.user.count({
        where: {
          createdAt: {
            gte: currentMonthStart,
          },
        },
      });

      // For now, we'll consider all users as active (can be enhanced with login tracking)
      const activeUsersThisMonth = totalUsers;

      // Get user growth trend for last 6 months
      const userGrowthTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthlyUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
        });

        userGrowthTrend.push({
          month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
          count: monthlyUsers,
        });
      }

      return {
        totalUsers,
        usersByRole: roleStats,
        newUsersThisMonth,
        activeUsersThisMonth,
        userGrowthTrend,
      };
    } catch (error) {
      console.error("Get user analytics error:", error);
      throw error;
    }
  }

  /**
   * Get enrollment trends and popular courses
   */
  static async getEnrollmentTrends(): Promise<EnrollmentTrends> {
    try {
      // Get monthly enrollment trends for last 6 months
      const monthly = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const [enrollments, requests] = await Promise.all([
          prisma.enrollment.count({
            where: {
              createdAt: {
                gte: monthStart,
                lt: monthEnd,
              },
            },
          }),
          prisma.enrollmentRequest.count({
            where: {
              createdAt: {
                gte: monthStart,
                lt: monthEnd,
              },
            },
          }),
        ]);

        // Calculate completions (students who completed all lessons in courses they enrolled in that month)
        const enrollmentsInMonth = await prisma.enrollment.findMany({
          where: {
            createdAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
          include: {
            course: {
              include: {
                sections: {
                  include: {
                    lessons: {
                      include: {
                        completions: {
                          where: {
                            completed: true,
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

        let completions = 0;
        enrollmentsInMonth.forEach(enrollment => {
          const totalLessons = enrollment.course.sections.reduce(
            (total, section) => total + section.lessons.length,
            0
          );
          const completedLessons = enrollment.course.sections.reduce(
            (total, section) => 
              total + section.lessons.reduce(
                (lessonTotal, lesson) => 
                  lessonTotal + lesson.completions.filter(
                    completion => completion.studentId === enrollment.studentId
                  ).length,
                0
              ),
            0
          );
          
          if (totalLessons > 0 && completedLessons === totalLessons) {
            completions++;
          }
        });

        monthly.push({
          month: monthStart.toISOString().substring(0, 7),
          enrollments,
          completions,
          requests,
        });
      }

      // Get popular courses (top 10 by enrollment count)
      const popularCourses = await prisma.course.findMany({
        include: {
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: {
          enrollments: {
            _count: 'desc',
          },
        },
        take: 10,
      });

      const popular = popularCourses.map(course => ({
        courseId: course.id,
        title: course.title,
        enrollmentCount: course._count.enrollments,
      }));

      return {
        monthly,
        popular,
      };
    } catch (error) {
      console.error("Get enrollment trends error:", error);
      throw error;
    }
  }

  /**
   * Get system usage statistics (placeholder implementation)
   */
  static async getSystemUsageStats(): Promise<SystemUsageStats> {
    try {
      // This is a placeholder implementation
      // In a real system, you would track user sessions, login times, device info, etc.
      
      return {
        totalLogins: 0, // Would be tracked in a sessions table
        averageSessionDuration: 0, // Would be calculated from session data
        mostActiveHours: [], // Would be calculated from login/activity timestamps
        deviceStats: {
          desktop: 0,
          mobile: 0,
          tablet: 0,
        },
      };
    } catch (error) {
      console.error("Get system usage stats error:", error);
      throw error;
    }
  }

  /**
   * Get teacher assignment statistics
   */
  static async getTeacherAssignments(): Promise<TeacherAssignment[]> {
    try {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: {
            select: {
              name: true,
            },
          },
          courses: {
            include: {
              enrollments: true,
              sections: {
                include: {
                  lessons: {
                    include: {
                      completions: {
                        where: {
                          completed: true,
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

      return teachers.map(teacher => {
        const totalStudents = teacher.courses.reduce(
          (total, course) => total + course.enrollments.length,
          0
        );

        let totalProgress = 0;
        let totalEnrollments = 0;

        teacher.courses.forEach(course => {
          const totalLessons = course.sections.reduce(
            (total, section) => total + section.lessons.length,
            0
          );

          course.enrollments.forEach(enrollment => {
            totalEnrollments++;
            const studentCompletions = course.sections.reduce(
              (total, section) => 
                total + section.lessons.reduce(
                  (lessonTotal, lesson) => 
                    lessonTotal + lesson.completions.filter(
                      completion => completion.studentId === enrollment.studentId
                    ).length,
                  0
                ),
              0
            );
            
            const studentProgress = totalLessons > 0 
              ? (studentCompletions / totalLessons) * 100 
              : 0;
            totalProgress += studentProgress;
          });
        });

        const averageProgress = totalEnrollments > 0
          ? Math.round(totalProgress / totalEnrollments)
          : 0;

        return {
          teacherId: teacher.id,
          teacherName: teacher.user.name,
          assignedCourses: teacher.courses.length,
          totalStudents,
          averageProgress,
        };
      });
    } catch (error) {
      console.error("Get teacher assignments error:", error);
      throw error;
    }
  }
}