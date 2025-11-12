import { z } from 'zod';

/**
 * User roles enum for validation
 */
export const UserRole = z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'], {
  errorMap: () => ({ message: 'Role must be one of: ADMIN, TEACHER, STUDENT, PARENT' })
});

/**
 * Email validation schema with comprehensive rules
 */
const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string'
  })
  .min(1, 'Email cannot be empty')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim()
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    'Email cannot start or end with a dot'
  );

/**
 * Password validation schema for login (less strict)
 */
const loginPasswordSchema = z
  .string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string'
  })
  .min(1, 'Password cannot be empty')
  .max(128, 'Password must be less than 128 characters');

/**
 * Strong password validation schema for registration and updates
 */
const strongPasswordSchema = z
  .string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string'
  })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !/\s/.test(password),
    'Password cannot contain whitespace characters'
  )
  .refine(
    (password) => {
      // Sadece çok basit şifreleri engelle
      const veryCommonPasswords = ['password', '123456', 'qwerty', 'admin'];
      const lowerPassword = password.toLowerCase();
      // Sadece tam eşleşmeleri kontrol et
      return !veryCommonPasswords.includes(lowerPassword);
    },
    'Password cannot be a very common password'
  );

/**
 * Name validation schema
 */
const nameSchema = z
  .string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  })
  .min(1, 'Name cannot be empty')
  .max(100, 'Name must be less than 100 characters')
  .trim()
  .refine(
    (name) => /^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s\-'\.]+$/.test(name),
    'Name can only contain letters (including Turkish characters), spaces, hyphens, apostrophes, and dots'
  )
  .refine(
    (name) => name.length >= 2,
    'Name must be at least 2 characters long'
  );

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = z
  .string({
    required_error: 'Refresh token is required',
    invalid_type_error: 'Refresh token must be a string'
  })
  .min(1, 'Refresh token cannot be empty')
  .max(1000, 'Refresh token is too long')
  .trim();

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: loginPasswordSchema,
  }),
});

/**
 * Register request validation schema
 */
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: strongPasswordSchema,
    name: nameSchema,
    role: UserRole,
  }),
});

/**
 * Refresh token request validation schema
 */
export const refreshTokenRequestSchema = z.object({
  body: z.object({
    refreshToken: refreshTokenSchema,
  }),
});

/**
 * Update password request validation schema
 */
export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: loginPasswordSchema,
    newPassword: strongPasswordSchema,
  }),
}).refine(
  (data) => data.body.currentPassword !== data.body.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['body', 'newPassword']
  }
);

/**
 * Check email request validation schema
 */
export const checkEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Validate token request validation schema
 */
export const validateTokenSchema = z.object({
  body: z.object({
    refreshToken: refreshTokenSchema,
  }),
});

/**
 * Logout request validation schema
 */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: refreshTokenSchema,
  }),
});

/**
 * Password strength validation schema (for client-side validation)
 */
export const passwordStrengthSchema = z.object({
  body: z.object({
    password: z
      .string({
        required_error: 'Password is required',
        invalid_type_error: 'Password must be a string'
      })
      .min(1, 'Password cannot be empty'),
  }),
});

/**
 * Rate limiting bypass schema for testing
 */
export const rateLimitBypassSchema = z.object({
  headers: z.object({
    'x-test-bypass': z.string().optional(),
  }).optional(),
});

/**
 * Common query parameters for auth endpoints
 */
export const authQuerySchema = z.object({
  query: z.object({
    redirect: z.string().url('Redirect URL must be valid').optional(),
    remember: z.enum(['true', 'false']).optional(),
  }).optional(),
});

// Export types for TypeScript
export type LoginRequest = z.infer<typeof loginSchema>['body'];
export type RegisterRequest = z.infer<typeof registerSchema>['body'];
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>['body'];
export type UpdatePasswordRequest = z.infer<typeof updatePasswordSchema>['body'];
export type CheckEmailRequest = z.infer<typeof checkEmailSchema>['body'];
export type ValidateTokenRequest = z.infer<typeof validateTokenSchema>['body'];
export type LogoutRequest = z.infer<typeof logoutSchema>['body'];
export type PasswordStrengthRequest = z.infer<typeof passwordStrengthSchema>['body'];

/**
 * Auth validation error codes for consistent error handling
 */
export const AUTH_ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_ROLE: 'INVALID_ROLE',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_TOKEN: 'INVALID_TOKEN',
  NAME_TOO_SIMILAR: 'NAME_TOO_SIMILAR',
  PASSWORD_REUSE: 'PASSWORD_REUSE',
  INVALID_FORMAT: 'INVALID_FORMAT',
} as const;