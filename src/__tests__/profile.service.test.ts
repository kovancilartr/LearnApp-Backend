import { ProfileService } from '../services/profile.service';
import { prisma } from '../config/database';
import { hashPassword } from '../utils/password.utils';
import { Role } from '@prisma/client';
import { NotificationPreferences, ProfileUpdateData, ChangePasswordRequest } from '../types/profile.types';

// Mock Prisma
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock password utils
jest.mock('../utils/password.utils', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  validatePasswordStrength: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    const userId = 'test-user-id';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: Role.STUDENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      password: 'hashed-password',
      studentProfile: null,
      teacherProfile: null,
      parentProfile: null,
    };

    it('should update user profile successfully', async () => {
      const updateData: ProfileUpdateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user with same email
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await ProfileService.updateProfile(userId, updateData);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: updateData.email!.toLowerCase(),
          NOT: { id: userId },
        },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateData.name!.trim(),
          email: updateData.email!.toLowerCase(),
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw error if email already exists', async () => {
      const updateData: ProfileUpdateData = {
        email: 'existing@example.com',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser); // Existing user found

      await expect(ProfileService.updateProfile(userId, updateData)).rejects.toThrow('Email already exists');
    });

    it('should handle update without email change', async () => {
      const updateData: ProfileUpdateData = {
        name: 'Updated Name Only',
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await ProfileService.updateProfile(userId, updateData);

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('changePassword', () => {
    const userId = 'test-user-id';
    const mockUser = {
      id: userId,
      password: 'old-hashed-password',
    };

    it('should change password successfully', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock password utilities
      const { comparePassword, validatePasswordStrength } = require('../utils/password.utils');
      comparePassword
        .mockResolvedValueOnce(true) // Old password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
        score: 85,
      });

      mockHashPassword.mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await ProfileService.changePassword(userId, passwordData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, password: true },
      });

      expect(comparePassword).toHaveBeenCalledWith(passwordData.oldPassword, mockUser.password);
      expect(comparePassword).toHaveBeenCalledWith(passwordData.newPassword, mockUser.password);
      expect(validatePasswordStrength).toHaveBeenCalledWith(passwordData.newPassword);
      expect(mockHashPassword).toHaveBeenCalledWith(passwordData.newPassword);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          password: 'new-hashed-password',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if user not found', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(ProfileService.changePassword(userId, passwordData)).rejects.toThrow('User not found');
    });

    it('should throw error if old password is incorrect', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'wrongPassword',
        newPassword: 'newPassword456!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const { comparePassword } = require('../utils/password.utils');
      comparePassword.mockResolvedValue(false);

      await expect(ProfileService.changePassword(userId, passwordData)).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error if new password is same as old password', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'samePassword123!',
        newPassword: 'samePassword123!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const { comparePassword } = require('../utils/password.utils');
      comparePassword
        .mockResolvedValueOnce(true) // Old password is correct
        .mockResolvedValueOnce(true); // New password is same

      await expect(ProfileService.changePassword(userId, passwordData)).rejects.toThrow('New password must be different from current password');
    });

    it('should throw error if new password validation fails', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'oldPassword123!',
        newPassword: 'weak',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const { comparePassword, validatePasswordStrength } = require('../utils/password.utils');
      comparePassword
        .mockResolvedValueOnce(true) // Old password is correct
        .mockResolvedValueOnce(false); // New password is different
      
      validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password is too weak'],
        strength: 'weak',
        score: 20,
      });

      await expect(ProfileService.changePassword(userId, passwordData)).rejects.toThrow('Password validation failed: Password is too weak');
    });
  });

  describe('getNotificationPreferences', () => {
    const userId = 'test-user-id';
    const defaultPreferences: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      enrollmentUpdates: true,
      courseUpdates: true,
      quizResults: true,
      systemAnnouncements: true,
      weeklyDigest: false,
    };

    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-id',
        userId,
        preferences: defaultPreferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await ProfileService.getNotificationPreferences(userId);

      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(result).toEqual(defaultPreferences);
    });

    it('should create default preferences if none exist', async () => {
      const mockCreatedPreferences = {
        id: 'new-pref-id',
        userId,
        preferences: defaultPreferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);
      mockPrisma.userPreferences.create.mockResolvedValue(mockCreatedPreferences);

      const result = await ProfileService.getNotificationPreferences(userId);

      expect(mockPrisma.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId,
          preferences: defaultPreferences,
        },
      });

      expect(result).toEqual(defaultPreferences);
    });
  });

  describe('updateNotificationPreferences', () => {
    const userId = 'test-user-id';
    const mockUser = { id: userId };
    const newPreferences: NotificationPreferences = {
      emailNotifications: false,
      pushNotifications: true,
      enrollmentUpdates: false,
      courseUpdates: true,
      quizResults: false,
      systemAnnouncements: true,
      weeklyDigest: true,
    };

    it('should update notification preferences successfully', async () => {
      const mockUpdatedPreferences = {
        id: 'pref-id',
        userId,
        preferences: newPreferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userPreferences.upsert.mockResolvedValue(mockUpdatedPreferences);

      const result = await ProfileService.updateNotificationPreferences(userId, newPreferences);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true },
      });

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          preferences: newPreferences,
          updatedAt: expect.any(Date),
        },
        create: {
          userId,
          preferences: newPreferences,
        },
      });

      expect(result).toEqual(newPreferences);
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(ProfileService.updateNotificationPreferences(userId, newPreferences)).rejects.toThrow('User not found');
    });
  });

  describe('validateProfileData', () => {
    it('should validate valid profile data', () => {
      const validData: ProfileUpdateData = {
        name: 'Valid Name',
        email: 'valid@example.com',
      };

      const result = ProfileService.validateProfileData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const invalidData: ProfileUpdateData = {
        name: '',
      };

      const result = ProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be empty');
    });

    it('should reject short name', () => {
      const invalidData: ProfileUpdateData = {
        name: 'A',
      };

      const result = ProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be at least 2 characters long');
    });

    it('should reject long name', () => {
      const invalidData: ProfileUpdateData = {
        name: 'A'.repeat(101),
      };

      const result = ProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must not exceed 100 characters');
    });

    it('should reject invalid email format', () => {
      const invalidData: ProfileUpdateData = {
        email: 'invalid-email',
      };

      const result = ProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject empty email', () => {
      const invalidData: ProfileUpdateData = {
        email: '',
      };

      const result = ProfileService.validateProfileData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email cannot be empty');
    });
  });
});