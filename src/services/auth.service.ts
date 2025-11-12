import { prisma } from '../config/database';
import { authConfig } from '../config/jwt';
import { 
  generateTokenPair, 
  refreshAccessToken, 
  revokeRefreshToken, 
  revokeAllRefreshTokens,
  validateRefreshToken,
  cleanupExpiredTokens
} from '../utils/jwt.utils';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.utils';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  RefreshTokenResponse,
  TokenPayload 
} from '../types/auth.types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Password validation is already handled by Zod schema validation
      // No need for additional validation here

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user with transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            name: data.name.trim(),
            password: hashedPassword,
            role: data.role,
          },
        });

        // Create role-specific profile
        switch (data.role) {
          case 'STUDENT':
            await tx.student.create({
              data: {
                userId: user.id,
              },
            });
            break;
          case 'TEACHER':
            await tx.teacher.create({
              data: {
                userId: user.id,
              },
            });
            break;
          case 'PARENT':
            await tx.parent.create({
              data: {
                userId: user.id,
              },
            });
            break;
          // ADMIN doesn't need a separate profile
        }

        return user;
      });

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: result.id,
        email: result.email,
        role: result.role,
      };

      const tokens = await generateTokenPair(tokenPayload);

      return {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        tokens,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Clean up old refresh tokens if user has too many
      await this.cleanupUserRefreshTokens(user.id);

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const tokens = await generateTokenPair(tokenPayload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const tokens = await refreshAccessToken(data.refreshToken);
      return { tokens };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    try {
      await revokeRefreshToken(refreshToken);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   */
  static async logoutAll(userId: string): Promise<void> {
    try {
      await revokeAllRefreshTokens(userId);
    } catch (error) {
      console.error('Logout all error:', error);
      throw new Error('Failed to logout from all devices');
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: {
            select: {
              id: true,
              parentId: true,
            },
          },
          teacherProfile: {
            select: {
              id: true,
            },
          },
          parentProfile: {
            select: {
              id: true,
              children: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`New password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password and revoke all refresh tokens for security
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword },
        });

        // Revoke all refresh tokens to force re-login
        await tx.refreshToken.deleteMany({
          where: { userId },
        });
      });
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  /**
   * Validate refresh token
   */
  static async validateRefreshToken(token: string): Promise<boolean> {
    try {
      return await validateRefreshToken(token);
    } catch (error) {
      console.error('Validate refresh token error:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      return await cleanupExpiredTokens();
    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      return 0;
    }
  }

  /**
   * Clean up old refresh tokens for a user (keep only the most recent ones)
   */
  private static async cleanupUserRefreshTokens(userId: string): Promise<void> {
    try {
      const userTokens = await prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (userTokens.length >= authConfig.maxRefreshTokensPerUser) {
        // Keep only the most recent tokens
        const tokensToDelete = userTokens.slice(authConfig.maxRefreshTokensPerUser - 1);
        const tokenIdsToDelete = tokensToDelete.map(token => token.id);

        await prisma.refreshToken.deleteMany({
          where: {
            id: { in: tokenIdsToDelete },
          },
        });
      }
    } catch (error) {
      console.error('Cleanup user refresh tokens error:', error);
      // Don't throw error as this is a cleanup operation
    }
  }

  /**
   * Get user's active refresh tokens count
   */
  static async getUserActiveTokensCount(userId: string): Promise<number> {
    try {
      return await prisma.refreshToken.count({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('Get user active tokens count error:', error);
      return 0;
    }
  }

  /**
   * Check if user exists by email
   */
  static async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error('Check user exists error:', error);
      return false;
    }
  }
}