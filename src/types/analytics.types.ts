export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalLessons: number;
  totalQuizzes: number;
  activeEnrollments: number;
  pendingRequests: number;
  monthlyGrowth: {
    courses: number;
    students: number;
    enrollments: number;
  };
}

export interface CourseAnalytics {
  courseId: string;
  title: string;
  studentCount: number;
  completionRate: number;
  averageProgress: number;
  teacherName: string | null;
  lessonCount: number;
  quizCount: number;
  createdAt: Date;
}

export interface UserAnalytics {
  totalUsers: number;
  usersByRole: {
    ADMIN: number;
    TEACHER: number;
    STUDENT: number;
    PARENT: number;
  };
  newUsersThisMonth: number;
  activeUsersThisMonth: number;
  userGrowthTrend: Array<{
    month: string;
    count: number;
  }>;
}

export interface EnrollmentTrends {
  monthly: Array<{
    month: string;
    enrollments: number;
    completions: number;
    requests: number;
  }>;
  popular: Array<{
    courseId: string;
    title: string;
    enrollmentCount: number;
  }>;
}

export interface SystemUsageStats {
  totalLogins: number;
  averageSessionDuration: number;
  mostActiveHours: Array<{
    hour: number;
    activityCount: number;
  }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface TeacherAssignment {
  teacherId: string;
  teacherName: string;
  assignedCourses: number;
  totalStudents: number;
  averageProgress: number;
}

export interface SystemAnalytics {
  overview: DashboardStats;
  courses: CourseAnalytics[];
  users: UserAnalytics;
  enrollments: EnrollmentTrends;
  teachers: TeacherAssignment[];
  usage: SystemUsageStats;
}

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  courseId?: string;
  teacherId?: string;
  includeInactive?: boolean;
}

export interface AnalyticsExportData {
  type: 'dashboard' | 'courses' | 'users' | 'enrollments';
  format: 'csv' | 'excel' | 'json';
  data: any;
  filename: string;
  generatedAt: Date;
}