import { Request } from 'express';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutAllRequest {
  userId: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
}

export interface RefreshTokenData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// User Profile Types (moved from user.types.ts for consistency)
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: StudentProfile;
  teacherProfile?: TeacherProfile;
  parentProfile?: ParentProfile;
}

export interface StudentProfile {
  id: string;
  userId: string;
  parentId?: string;
  parent?: ParentInfo;
  enrollments?: EnrollmentInfo[];
  completions?: CompletionInfo[];
}

export interface TeacherProfile {
  id: string;
  userId: string;
  courses?: CourseInfo[];
}

export interface ParentProfile {
  id: string;
  userId: string;
  children?: StudentInfo[];
}

export interface ParentInfo {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StudentInfo {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CourseInfo {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
}

export interface EnrollmentInfo {
  id: string;
  courseId: string;
  course: {
    id: string;
    title: string;
    description?: string;
  };
  createdAt: Date;
}

export interface CompletionInfo {
  id: string;
  lessonId: string;
  lesson: {
    id: string;
    title: string;
  };
  completed: boolean;
  createdAt: Date;
}

export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
}

export interface LinkParentChildRequest {
  parentId: string;
  studentId: string;
}

export interface UnlinkParentChildRequest {
  studentId: string;
}

export interface UserSearchQuery {
  search?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  page?: number;
  limit?: number;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  createdAt: Date;
  profileId?: string;
}

export interface RoleSwitchRequest {
  targetRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  childId?: string; // Required when switching to STUDENT role
}