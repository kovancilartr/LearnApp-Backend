import { Request, Response } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { ProfileService } from '../services/profile.service';
import { AuthenticatedRequest } from '../types/auth.types';
import { NotificationPreferences, ProfileUpdateData, ChangePasswordRequest } from '../types/profile.types';
import { Role } from '@prisma/client';

// Mock ProfileService
jest.mock('../services/profile.service');

const mockProfileService = ProfileService as jest.Mocked<typeof ProfileService>;

describe('ProfileController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      },
      body: {},
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: Role.STUDENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        enrollmentUpdates: true,
        courseUpdates: true,
        quizResults: true,
        systemAnnouncements: true,
        weeklyDigest: false,
      },
    };

    it('should get profile successfully', async () => {
      mockProfileService.getCompleteProfile.mockResolvedValue(mockProfile);

      await ProfileController.getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.getCompleteProfile).toHaveBeenCalledWith('test-user-id');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      mockProfileService.getCompleteProfile.mockRejectedValue(new Error('Service error'));

      await ProfileController.getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Service error',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateProfile', () => {
    const mockUpdatedProfile = {
      id: 'test-user-id',
      email: 'updated@example.com',
      name: 'Updated User',
      role: Role.STUDENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update profile successfully', async () => {
      const updateData: ProfileUpdateData = {
        name: 'Updated User',
        email: 'updated@example.com',
      };

      mockRequest.body = updateData;
      mockProfileService.validateProfileData.mockReturnValue({ isValid: true, errors: [] });
      mockProfileService.updateProfile.mockResolvedValue(mockUpdatedProfile);

      await ProfileController.updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.validateProfileData).toHaveBeenCalledWith(updateData);
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('test-user-id', updateData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProfile,
        message: 'Profile updated successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for validation errors', async () => {
      const updateData: ProfileUpdateData = {
        name: '',
        email: 'invalid-email',
      };

      mockRequest.body = updateData;
      mockProfileService.validateProfileData.mockReturnValue({
        isValid: false,
        errors: ['Name cannot be empty', 'Invalid email format'],
      });

      await ProfileController.updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name cannot be empty, Invalid email format',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle email already exists error', async () => {
      const updateData: ProfileUpdateData = {
        email: 'existing@example.com',
      };

      mockRequest.body = updateData;
      mockProfileService.validateProfileData.mockReturnValue({ isValid: true, errors: [] });
      mockProfileService.updateProfile.mockRejectedValue(new Error('Email already exists'));

      await ProfileController.updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };

      mockRequest.body = passwordData;
      mockProfileService.changePassword.mockResolvedValue();

      await ProfileController.changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.changePassword).toHaveBeenCalledWith('test-user-id', passwordData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for missing fields', async () => {
      mockRequest.body = { oldPassword: 'test' }; // Missing newPassword

      await ProfileController.changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Old password and new password are required',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle incorrect current password error', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'wrongPassword',
        newPassword: 'newPassword456!',
      };

      mockRequest.body = passwordData;
      mockProfileService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      await ProfileController.changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Current password is incorrect',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle password validation error', async () => {
      const passwordData: ChangePasswordRequest = {
        oldPassword: 'oldPassword123!',
        newPassword: 'weak',
      };

      mockRequest.body = passwordData;
      mockProfileService.changePassword.mockRejectedValue(new Error('Password validation failed: Password is too weak'));

      await ProfileController.changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password validation failed: Password is too weak',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('getNotificationPreferences', () => {
    const mockPreferences: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: false,
      enrollmentUpdates: true,
      courseUpdates: false,
      quizResults: true,
      systemAnnouncements: true,
      weeklyDigest: false,
    };

    it('should get notification preferences successfully', async () => {
      mockProfileService.getNotificationPreferences.mockResolvedValue(mockPreferences);

      await ProfileController.getNotificationPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.getNotificationPreferences).toHaveBeenCalledWith('test-user-id');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.getNotificationPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    const mockPreferences: NotificationPreferences = {
      emailNotifications: false,
      pushNotifications: true,
      enrollmentUpdates: false,
      courseUpdates: true,
      quizResults: false,
      systemAnnouncements: true,
      weeklyDigest: true,
    };

    it('should update notification preferences successfully', async () => {
      mockRequest.body = mockPreferences;
      mockProfileService.updateNotificationPreferences.mockResolvedValue(mockPreferences);

      await ProfileController.updateNotificationPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.updateNotificationPreferences).toHaveBeenCalledWith('test-user-id', mockPreferences);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
        message: 'Notification preferences updated successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.updateNotificationPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for invalid preferences format', async () => {
      mockRequest.body = 'invalid';

      await ProfileController.updateNotificationPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification preferences format',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      mockProfileService.deleteUserData.mockResolvedValue();

      await ProfileController.deleteProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockProfileService.deleteUserData).toHaveBeenCalledWith('test-user-id');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Profile deleted successfully',
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await ProfileController.deleteProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle constraint violation errors', async () => {
      mockProfileService.deleteUserData.mockRejectedValue(new Error('Cannot delete teacher with assigned courses'));

      await ProfileController.deleteProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONSTRAINT_VIOLATION',
          message: 'Cannot delete teacher with assigned courses',
        },
        timestamp: expect.any(String),
      });
    });
  });
});