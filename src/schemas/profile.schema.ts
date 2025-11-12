import { z } from 'zod';

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must not exceed 100 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .optional(),
  }).refine(
    (data) => data.name !== undefined || data.email !== undefined,
    {
      message: 'At least one field (name or email) must be provided',
    }
  ),
});

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  }).refine(
    (data) => data.oldPassword !== data.newPassword,
    {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }
  ),
});

/**
 * Schema for updating notification preferences
 */
export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    enrollmentUpdates: z.boolean(),
    courseUpdates: z.boolean(),
    quizResults: z.boolean(),
    systemAnnouncements: z.boolean(),
    weeklyDigest: z.boolean(),
  }),
});

/**
 * Schema for profile validation (used internally)
 */
export const profileValidationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .optional(),
});

/**
 * Schema for notification preferences validation
 */
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  enrollmentUpdates: z.boolean(),
  courseUpdates: z.boolean(),
  quizResults: z.boolean(),
  systemAnnouncements: z.boolean(),
  weeklyDigest: z.boolean(),
});

/**
 * Schema for password strength validation
 */
export const passwordStrengthSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
  .refine(
    (password) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', 'password123', '12345678', 'qwerty123',
        'admin123', 'welcome123', 'letmein123'
      ];
      return !weakPasswords.includes(password.toLowerCase());
    },
    {
      message: 'Password is too common, please choose a stronger password',
    }
  )
  .refine(
    (password) => {
      // Check for sequential characters
      const sequences = ['abcdefg', '1234567', 'qwertyui'];
      return !sequences.some(seq => password.toLowerCase().includes(seq));
    },
    {
      message: 'Password should not contain sequential characters',
    }
  )
  .refine(
    (password) => {
      // Check for repeated characters
      const repeatedPattern = /(.)\1{2,}/;
      return !repeatedPattern.test(password);
    },
    {
      message: 'Password should not contain repeated characters',
    }
  );

// Type exports for TypeScript
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>['body'];
export type UpdateNotificationPreferencesRequest = z.infer<typeof updateNotificationPreferencesSchema>['body'];
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type ProfileValidation = z.infer<typeof profileValidationSchema>;