import { UserProfile } from './auth.types';

// Re-export UserProfile for convenience
export { UserProfile } from './auth.types';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  enrollmentUpdates: boolean;
  courseUpdates: boolean;
  quizResults: boolean;
  systemAnnouncements: boolean;
  weeklyDigest: boolean;
}

export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
}

export interface ProfileResponse {
  user: UserProfile;
  preferences: NotificationPreferences;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
  updatedAt: Date;
}

// Database model for user preferences
export interface UserPreferencesModel {
  id: string;
  userId: string;
  preferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Validation interfaces
export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

// Request interfaces for API endpoints
export interface GetProfileRequest {
  userId: string;
}

export interface UpdateProfileRequest {
  userId: string;
  data: ProfileUpdateData;
}

export interface ChangePasswordApiRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export interface UpdateNotificationPreferencesRequest {
  userId: string;
  preferences: NotificationPreferences;
}

// Response interfaces for API endpoints
export interface GetProfileResponse {
  success: boolean;
  data: UserProfile & { preferences: NotificationPreferences };
}

export interface UpdateProfileResponse {
  success: boolean;
  data: UserProfile;
  message: string;
}

export interface ChangePasswordApiResponse {
  success: boolean;
  message: string;
}

export interface GetNotificationPreferencesResponse {
  success: boolean;
  data: NotificationPreferences;
}

export interface UpdateNotificationPreferencesResponse {
  success: boolean;
  data: NotificationPreferences;
  message: string;
}

// Error types
export interface ProfileError {
  code: string;
  message: string;
  field?: string;
}

export interface ProfileErrorResponse {
  success: false;
  error: ProfileError;
  timestamp: string;
}

// Constants for validation
export const PROFILE_VALIDATION_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
} as const;

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  enrollmentUpdates: true,
  courseUpdates: true,
  quizResults: true,
  systemAnnouncements: true,
  weeklyDigest: false,
} as const;