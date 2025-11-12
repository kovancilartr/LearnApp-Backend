import { UserProfile } from '../types/auth.types';

/**
 * Serialize user profile for API response
 * Converts Date fields to ISO strings
 */
export const serializeUserProfile = (user: UserProfile): any => {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    studentProfile: user.studentProfile ? {
      ...user.studentProfile,
      enrollments: user.studentProfile.enrollments?.map(enrollment => ({
        ...enrollment,
        createdAt: typeof enrollment.createdAt === 'string' ? enrollment.createdAt : enrollment.createdAt.toISOString()
      })),
      completions: user.studentProfile.completions?.map(completion => ({
        ...completion,
        createdAt: typeof completion.createdAt === 'string' ? completion.createdAt : completion.createdAt.toISOString()
      }))
    } : undefined,
    teacherProfile: user.teacherProfile ? {
      ...user.teacherProfile,
      courses: user.teacherProfile.courses?.map(course => ({
        ...course,
        createdAt: typeof course.createdAt === 'string' ? course.createdAt : course.createdAt.toISOString()
      }))
    } : undefined,
    parentProfile: user.parentProfile
  };
};

/**
 * Serialize course data for API response
 */
export const serializeCourse = (course: any) => {
  return {
    ...course,
    createdAt: course.createdAt?.toISOString?.() || course.createdAt,
    updatedAt: course.updatedAt?.toISOString?.() || course.updatedAt,
    sections: course.sections?.map((section: any) => ({
      ...section,
      lessons: section.lessons?.map((lesson: any) => ({
        ...lesson,
        completions: lesson.completions?.map((completion: any) => ({
          ...completion,
          createdAt: completion.createdAt?.toISOString?.() || completion.createdAt,
          updatedAt: completion.updatedAt?.toISOString?.() || completion.updatedAt
        }))
      }))
    })),
    enrollments: course.enrollments?.map((enrollment: any) => ({
      ...enrollment,
      createdAt: enrollment.createdAt?.toISOString?.() || enrollment.createdAt
    }))
  };
};

/**
 * Serialize quiz data for API response
 */
export const serializeQuiz = (quiz: any) => {
  return {
    ...quiz,
    createdAt: quiz.createdAt?.toISOString?.() || quiz.createdAt,
    attempts: quiz.attempts?.map((attempt: any) => ({
      ...attempt,
      startedAt: attempt.startedAt?.toISOString?.() || attempt.startedAt,
      finishedAt: attempt.finishedAt?.toISOString?.() || attempt.finishedAt
    }))
  };
};

/**
 * Serialize notification data for API response
 */
export const serializeNotification = (notification: any) => {
  return {
    ...notification,
    createdAt: notification.createdAt?.toISOString?.() || notification.createdAt,
    updatedAt: notification.updatedAt?.toISOString?.() || notification.updatedAt
  };
};