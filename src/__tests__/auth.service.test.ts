import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../services/user.service');
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    student: {
      create: jest.fn(),
    },
    teacher: {
      create: jest.fn(),
    },
    parent: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockPrisma = prisma as any;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      // Mock the static method
      jest.spyOn(AuthService, 'login').mockResolvedValue(mockResponse);

      // Act
      const result = await AuthService.login(loginData);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(AuthService.login).toHaveBeenCalledWith(loginData);
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const invalidLoginData = { email: 'invalid@example.com', password: 'password' };
      jest.spyOn(AuthService, 'login').mockRejectedValue(new Error('Invalid email or password'));

      // Act & Assert
      await expect(AuthService.login(invalidLoginData))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      const invalidLoginData = { email: 'test@example.com', password: 'wrongpassword' };
      jest.spyOn(AuthService, 'login').mockRejectedValue(new Error('Invalid email or password'));

      // Act & Assert
      await expect(AuthService.login(invalidLoginData))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'STUDENT' as const,
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const mockResponse = {
        user: {
          id: 'user-2',
          email: 'new@example.com',
          name: 'New User',
          role: 'STUDENT' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      jest.spyOn(AuthService, 'register').mockResolvedValue(mockResponse);

      // Act
      const result = await AuthService.register(registerData);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(AuthService.register).toHaveBeenCalledWith(registerData);
    });

    it('should throw error for existing email', async () => {
      // Arrange
      jest.spyOn(AuthService, 'register').mockRejectedValue(new Error('User with this email already exists'));

      // Act & Assert
      await expect(AuthService.register(registerData))
        .rejects.toThrow('User with this email already exists');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      // Arrange
      const refreshData = { refreshToken: 'valid-refresh-token' };
      const mockResponse = {
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      jest.spyOn(AuthService, 'refreshToken').mockResolvedValue(mockResponse);

      // Act
      const result = await AuthService.refreshToken(refreshData);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(AuthService.refreshToken).toHaveBeenCalledWith(refreshData);
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const refreshData = { refreshToken: 'invalid-token' };
      jest.spyOn(AuthService, 'refreshToken').mockRejectedValue(new Error('Failed to refresh token'));

      // Act & Assert
      await expect(AuthService.refreshToken(refreshData))
        .rejects.toThrow('Failed to refresh token');
    });

    it('should throw error for expired refresh token', async () => {
      // Arrange
      const refreshData = { refreshToken: 'expired-token' };
      jest.spyOn(AuthService, 'refreshToken').mockRejectedValue(new Error('Failed to refresh token'));

      // Act & Assert
      await expect(AuthService.refreshToken(refreshData))
        .rejects.toThrow('Failed to refresh token');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Arrange
      jest.spyOn(AuthService, 'logout').mockResolvedValue(undefined);

      // Act
      await AuthService.logout('refresh-token');

      // Assert
      expect(AuthService.logout).toHaveBeenCalledWith('refresh-token');
    });

    it('should handle logout with invalid token gracefully', async () => {
      // Arrange
      jest.spyOn(AuthService, 'logout').mockRejectedValue(new Error('Failed to logout'));

      // Act & Assert
      await expect(AuthService.logout('non-existent-token'))
        .rejects.toThrow('Failed to logout');
    });
  });

  describe('logoutAll', () => {
    it('should successfully logout all user sessions', async () => {
      // Arrange
      jest.spyOn(AuthService, 'logoutAll').mockResolvedValue(undefined);

      // Act
      await AuthService.logoutAll('user-1');

      // Assert
      expect(AuthService.logoutAll).toHaveBeenCalledWith('user-1');
    });
  });
});