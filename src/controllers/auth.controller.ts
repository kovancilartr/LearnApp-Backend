import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../types/auth.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponse, createSuccessResponse, createErrorResponse } from '../utils/response.utils';
import { handleAuthError, AuthError } from '../utils/auth-error.utils';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;
      
      const result = await AuthService.register(registerData);
      
      // Format response to match frontend expectations
      const responseData = {
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString()
        },
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      };
      
      const response: ApiResponse<typeof responseData> = createSuccessResponse(
        responseData, 
        'Account created successfully. Welcome to LearnApp!'
      );
      res.status(201).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      
      const result = await AuthService.login(loginData);
      
      // Format response to match frontend expectations
      const responseData = {
        user: {
          ...result.user,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString()
        },
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      };
      
      const response: ApiResponse<typeof responseData> = createSuccessResponse(
        responseData, 
        `Welcome back, ${result.user.name}!`
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshData: RefreshTokenRequest = req.body;
      
      const result = await AuthService.refreshToken(refreshData);
      
      // Format response to match frontend expectations
      const responseData = {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      };
      
      const response: ApiResponse<typeof responseData> = createSuccessResponse(
        responseData, 
        'Session refreshed successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Logout user (revoke refresh token)
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      await AuthService.logout(refreshToken);
      
      const response: ApiResponse<null> = createSuccessResponse(
        null, 
        'You have been logged out successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   * POST /api/auth/logout-all
   */
  static async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthError('INVALID_TOKEN', 'Authentication required');
      }
      
      await AuthService.logoutAll(req.user.id);
      
      const response: ApiResponse<null> = createSuccessResponse(
        null, 
        'You have been logged out from all devices'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthError('INVALID_TOKEN', 'Authentication required');
      }
      
      const userProfile = await AuthService.getUserProfile(req.user.id);
      
      const response: ApiResponse<typeof userProfile> = createSuccessResponse(
        userProfile, 
        'Profile retrieved successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Update user password
   * PUT /api/auth/password
   */
  static async updatePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthError('INVALID_TOKEN', 'Authentication required');
      }
      
      const { currentPassword, newPassword } = req.body;
      
      await AuthService.updatePassword(req.user.id, currentPassword, newPassword);
      
      const response: ApiResponse<null> = createSuccessResponse(
        null, 
        'Your password has been updated successfully'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Validate refresh token
   * POST /api/auth/validate-token
   */
  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      const isValid = await AuthService.validateRefreshToken(refreshToken);
      
      const response: ApiResponse<{ isValid: boolean }> = createSuccessResponse(
        { isValid }, 
        isValid ? 'Token is valid' : 'Token is invalid'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Check if user exists by email
   * POST /api/auth/check-email
   */
  static async checkEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      const exists = await AuthService.userExistsByEmail(email);
      
      const response: ApiResponse<{ exists: boolean }> = createSuccessResponse(
        { exists }, 
        exists ? 'Email is already registered' : 'Email is available'
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }

  /**
   * Get user's active tokens count
   * GET /api/auth/active-tokens
   */
  static async getActiveTokensCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthError('INVALID_TOKEN', 'Authentication required');
      }
      
      const count = await AuthService.getUserActiveTokensCount(req.user.id);
      
      const response: ApiResponse<{ count: number }> = createSuccessResponse(
        { count }, 
        `You have ${count} active session${count !== 1 ? 's' : ''}`
      );
      res.status(200).json(response);
    } catch (error) {
      handleAuthError(error, res);
    }
  }
}