import { Course, Section, Lesson, Enrollment, Teacher, Student, User } from '@prisma/client';

// Course Types
export interface CreateCourseRequest {
  title: string;
  description?: string;
  teacherId?: string;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
}

export interface CourseSearchQuery {
  search?: string;
  teacherId?: string;
  page?: number;
  limit?: number;
}

export interface AssignTeacherRequest {
  courseId: string;
  teacherId: string;
}

// Course with full details including relations
export interface CourseWithDetails extends Course {
  teacher?: Teacher & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  sections: (Section & {
    lessons: (Lesson & {
      completions?: {
        completed: boolean;
        createdAt: Date;
      }[];
    })[];
  })[];
  enrollments: (Enrollment & {
    student: Student & {
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
  })[];
  _count: {
    enrollments: number;
    sections: number;
  };
}

// Course list item for pagination
export interface CourseListItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher?: Teacher & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
  enrollmentCount: number;
  sectionCount: number;
}

// Section Types
export interface CreateSectionRequest {
  title: string;
  courseId: string;
  order?: number;
}

export interface UpdateSectionRequest {
  title?: string;
  order?: number;
}

export interface SectionWithLessons extends Section {
  lessons: Lesson[];
  course: {
    id: string;
    title: string;
  };
}

// Lesson Types
export interface CreateLessonRequest {
  title: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  sectionId: string;
  order?: number;
}

export interface UpdateLessonRequest {
  title?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  order?: number;
}

export interface LessonWithDetails extends Lesson {
  section: Section & {
    course: {
      id: string;
      title: string;
    };
  };
  completions: any[];
}

// Enrollment Types
export interface EnrollStudentRequest {
  courseId: string;
  studentId: string;
}

export interface UnenrollStudentRequest {
  courseId: string;
  studentId: string;
}

export interface CourseEnrollment extends Enrollment {
  student: Student & {
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

// Progress Types
export interface LessonProgress {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt?: Date;
}

// API Response version with serialized dates
export interface LessonProgressResponse {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt?: string;
}

export interface SectionProgress {
  id: string;
  title: string;
  order: number;
  lessons: LessonProgress[];
}

// API Response version with serialized dates
export interface SectionProgressResponse {
  id: string;
  title: string;
  order: number;
  lessons: LessonProgressResponse[];
}

export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  studentId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  sections: SectionProgress[];
  enrolledAt: Date;
}

// API Response version with serialized dates
export interface CourseProgressResponse {
  courseId: string;
  courseTitle: string;
  studentId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  sections: SectionProgressResponse[];
  enrolledAt: string;
}

// Teacher Assignment Types
export interface TeacherAssignment {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  courseId: string;
  courseTitle: string;
  assignedAt: Date;
}

// Course Statistics Types
export interface CourseStatistics {
  totalCourses: number;
  totalEnrollments: number;
  totalSections: number;
  totalLessons: number;
  averageEnrollmentsPerCourse: number;
  averageLessonsPerCourse: number;
}

// Bulk Operations Types
export interface BulkEnrollRequest {
  courseId: string;
  studentIds: string[];
}

export interface BulkUnenrollRequest {
  courseId: string;
  studentIds: string[];
}

export interface BulkEnrollResult {
  successful: string[];
  failed: {
    studentId: string;
    error: string;
  }[];
}