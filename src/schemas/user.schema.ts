import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateUserProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Name can only contain letters and spaces')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .optional(),
});

export const linkParentChildSchema = z.object({
  parentId: z.string().uuid('Invalid parent ID format'),
  studentId: z.string().uuid('Invalid student ID format'),
});

export const unlinkParentChildSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
});

export const userSearchQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
});

export const parentIdParamSchema = z.object({
  parentId: z.string().uuid('Invalid parent ID format'),
});

export const roleSwitchSchema = z.object({
  targetRole: z.nativeEnum(Role),
  childId: z.string().uuid('Invalid child ID format').optional(),
}).refine((data) => {
  // If switching to STUDENT role, childId is required
  if (data.targetRole === Role.STUDENT && !data.childId) {
    return false;
  }
  return true;
}, {
  message: 'Child ID is required when switching to STUDENT role',
  path: ['childId'],
});

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type LinkParentChildRequest = z.infer<typeof linkParentChildSchema>;
export type UnlinkParentChildRequest = z.infer<typeof unlinkParentChildSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type ParentIdParam = z.infer<typeof parentIdParamSchema>;
export type RoleSwitchRequest = z.infer<typeof roleSwitchSchema>;