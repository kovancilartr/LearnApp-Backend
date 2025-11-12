import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';
import { 
  ProfileUpdateData,
  ChangePasswordRequest,
  NotificationPreferences,
  GetProfileResponse,
  UpdateProfileResponse,
  ChangePasswordApiResponse,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesResponse,
  ProfileErrorResponse
} from '../types/profile.types';
import { AuthenticatedRequest } from '../types/auth.types';

export class ProfileController {
  /**
   * Get user's complete profile with preferences
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      const profile = await ProfileService.getCompleteProfile(userId);

      const response: GetProfileResponse = {
        success: true,
        data: profile,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProfileController.getProfile error:', error);
      
      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get profile',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Update user profile information
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const profileData: ProfileUpdateData = req.body;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Validate profile data
      const validation = ProfileService.validateProfileData(profileData);
      if (!validation.isValid) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join(', '),
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(errorResponse);
        return;
      }

      const updatedProfile = await ProfileService.updateProfile(userId, profileData);

      const response: UpdateProfileResponse = {
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProfileController.updateProfile error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = 'Failed to update profile';

      if (error instanceof Error) {
        if (error.message.includes('Email already exists')) {
          statusCode = 409;
          errorCode = 'CONFLICT';
          errorMessage = 'Email already exists';
        } else if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          errorMessage = 'User not found';
        } else {
          errorMessage = error.message;
        }
      }

      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const passwordData: ChangePasswordRequest = req.body;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Validate required fields
      if (!passwordData.oldPassword || !passwordData.newPassword) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Old password and new password are required',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(errorResponse);
        return;
      }

      await ProfileService.changePassword(userId, passwordData);

      const response: ChangePasswordApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProfileController.changePassword error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = 'Failed to change password';

      if (error instanceof Error) {
        if (error.message.includes('Current password is incorrect')) {
          statusCode = 400;
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = 'Current password is incorrect';
        } else if (error.message.includes('New password must be different')) {
          statusCode = 400;
          errorCode = 'VALIDATION_ERROR';
          errorMessage = 'New password must be different from current password';
        } else if (error.message.includes('Password validation failed')) {
          statusCode = 400;
          errorCode = 'VALIDATION_ERROR';
          errorMessage = error.message;
        } else if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          errorMessage = 'User not found';
        } else {
          errorMessage = error.message;
        }
      }

      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      const preferences = await ProfileService.getNotificationPreferences(userId);

      const response: GetNotificationPreferencesResponse = {
        success: true,
        data: preferences,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProfileController.getNotificationPreferences error:', error);
      
      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get notification preferences',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const preferences: NotificationPreferences = req.body;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Validate preferences object
      if (!preferences || typeof preferences !== 'object') {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notification preferences format',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(errorResponse);
        return;
      }

      const updatedPreferences = await ProfileService.updateNotificationPreferences(userId, preferences);

      const response: UpdateNotificationPreferencesResponse = {
        success: true,
        data: updatedPreferences,
        message: 'Notification preferences updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('ProfileController.updateNotificationPreferences error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = 'Failed to update notification preferences';

      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          errorMessage = 'User not found';
        } else {
          errorMessage = error.message;
        }
      }

      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Delete user profile data (GDPR compliance)
   */
  static async deleteProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        const errorResponse: ProfileErrorResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      await ProfileService.deleteUserData(userId);

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      console.error('ProfileController.deleteProfile error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = 'Failed to delete profile';

      if (error instanceof Error) {
        if (error.message.includes('Cannot delete teacher with assigned courses')) {
          statusCode = 400;
          errorCode = 'CONSTRAINT_VIOLATION';
          errorMessage = 'Cannot delete teacher with assigned courses';
        } else if (error.message.includes('Cannot delete parent with linked children')) {
          statusCode = 400;
          errorCode = 'CONSTRAINT_VIOLATION';
          errorMessage = 'Cannot delete parent with linked children';
        } else if (error.message.includes('User not found')) {
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          errorMessage = 'User not found';
        } else {
          errorMessage = error.message;
        }
      }

      const errorResponse: ProfileErrorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(errorResponse);
    }
  }
}