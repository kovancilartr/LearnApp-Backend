import request from 'supertest';
import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { validateRequest } from '../middleware/validation.middleware';

// Mock dependencies
jest.mock('../services/auth.service');
jest.mock('../middleware/validation.middleware');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockValidationMiddleware = validateRequest as jest.MockedFunction<typeof validateRequest>;

describe('AuthController', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock validation middleware to pass through
    mockValidationMiddleware.mockImplementation(() => (req: any, res: any, next: any) => next());
    
    // Setup routes
    app.post('/auth/login', AuthController.login);
    app.post('/auth/register', AuthController.register);
    app.post('/auth/refresh', AuthController.refreshToken);
    app.post('/auth/logout', AuthController.logout);
    app.post('/auth/logout-all', AuthController.logoutAll);
  });

  describe('POST /auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      const mockResponse = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      
      (mockAuthService.login as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      (mockAuthService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing email', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing password', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    const registerData = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'STUDENT',
    };

    it('should register successfully with valid data', async () => {
      // Arrange
      const mockResponse = {
        user: {
          id: 'user-2',
          email: 'new@example.com',
          name: 'New User',
          role: 'STUDENT',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      
      (mockAuthService.register as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
    });

    it('should return 409 for existing email', async () => {
      // Arrange
      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new Error('User already exists')
      );

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User already exists');
    });

    it('should return 400 for invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({ ...registerData, email: 'invalid-email' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({ ...registerData, password: '123' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshData = { refreshToken: 'valid-refresh-token' };
      const mockResponse = { accessToken: 'new-access-token' };
      
      (mockAuthService.refreshToken as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshData);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const refreshData = { refreshToken: 'invalid-refresh-token' };
      (mockAuthService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const logoutData = { refreshToken: 'refresh-token' };
      (mockAuthService.logout as jest.Mock).mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send(logoutData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        logoutData.refreshToken
      );
    });

    it('should handle logout with invalid token gracefully', async () => {
      // Arrange
      const logoutData = { refreshToken: 'invalid-token' };
      (mockAuthService.logout as jest.Mock).mockRejectedValue(
        new Error('Token not found')
      );

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send(logoutData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Token not found');
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout all sessions successfully', async () => {
      // Arrange
      const logoutAllData = { userId: 'user-1' };
      (mockAuthService.logoutAll as jest.Mock).mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/auth/logout-all')
        .send(logoutAllData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out from all devices');
      expect(mockAuthService.logoutAll).toHaveBeenCalledWith(
        logoutAllData.userId
      );
    });
  });
});