export interface ChildProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  enrolledCourses: {
    id: string;
    title: string;
    description: string;
    enrolledAt: Date;
    progress: {
      completedLessons: number;
      totalLessons: number;
      progressPercentage: number;
    };
  }[];
  recentActivity: {
    lessonId: string;
    lessonTitle: string;
    courseTitle: string;
    completedAt: Date;
  }[];
}

export interface ChildProgressReport {
  studentId: string;
  studentName: string;
  totalCourses: number;
  completedCourses: number;
  overallProgress: number;
  courseProgress: Array<{
    courseId: string;
    title: string;
    progress: number;
    lastActivity: Date | null;
    teacher: string;
  }>;
  recentQuizResults: Array<{
    quizId: string;
    quizTitle: string;
    courseTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    completedAt: Date;
  }>;
  upcomingDeadlines: Array<{
    type: 'quiz' | 'assignment';
    title: string;
    dueDate: Date;
    courseTitle: string;
  }>;
}

export interface ParentQuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  completedAt: Date;
  answers: Array<{
    questionId: string;
    questionText: string;
    selectedChoiceId: string;
    selectedChoiceText: string;
    correctChoiceId: string;
    correctChoiceText: string;
    isCorrect: boolean;
  }>;
}

export interface CreateEnrollmentRequestForChildRequest {
  courseId: string;
  message?: string;
}

export interface ParentDashboardSummary {
  totalChildren: number;
  totalCourses: number;
  totalCompletedCourses: number;
  averageProgress: number;
  recentActivity: Array<{
    childName: string;
    activityType: 'lesson_completed' | 'quiz_completed' | 'course_enrolled';
    activityTitle: string;
    courseTitle: string;
    timestamp: Date;
  }>;
  upcomingDeadlines: Array<{
    childName: string;
    type: 'quiz' | 'assignment';
    title: string;
    dueDate: Date;
    courseTitle: string;
  }>;
}

export interface ChildEnrollmentRequest {
  id: string;
  studentId: string;
  courseId: string;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  course: {
    id: string;
    title: string;
    description: string | null;
  };
}

export interface ChildNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}