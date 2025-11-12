import request from 'supertest';
import express from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

// Mock dependencies
jest.mock('../services/user.service');
jest.mock('../middleware/auth.middleware');
jest.mock('../middleware/role.middleware');

const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
const mockRoleMiddleware = roleMiddleware as jest.MockedFunction<typeof roleMiddleware>;

describe('UserController', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock middleware to pass through
    mockAuthMiddleware.mockImplementation(async (req: any, res: any, next: any) => {
      req.user = { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' };
      next();
    });
    
    mockRoleMiddleware.mockImplementation(() => (req: any, res: any, next: any) => next());
    
    // Setup routes
    app.get('/users', mockAuthMiddleware, mockRoleMiddleware(['ADMIN']), UserController.getAllUsers);
    app.get('/users/:userId', mockAuthMiddleware, UserController.getUserProfile);
    app.put('/users/:userId', mockAuthMiddleware, UserController.updateUserProfile);
    app.delete('/users/:userId', mockAuthMiddleware, mockRoleMiddleware(['ADMIN']), UserController.deleteUser);
    app.get('/profile', mockAuthMiddleware, UserController.getCurrentUserProfile);
    app.put('/profile', mockAuthMiddleware, UserController.updateCurrentUserProfile);
  });

  describe('GET /users', () => {
    it('should get all users successfully', async () => {
      // Arrange
      const mockUsers = {
        items: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            name: 'User 1',
            role: 'STUDENT' as const,
            createdAt: new Date(),
          },
          {
            id: 'user-2',
            email: 'user2@test.com',
            name: 'User 2',
            role: 'TEACHER' as const,
            createdAt: new Date(),
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      
      jest.spyOn(UserService, 'getAllUsers').mockResolvedValue(mockUsers);

      // Act
      const response = await request(app)
        .get('/users');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.getAllUsers).toHaveBeenCalled();
    });

    it('should handle error when getting users fails', async () => {
      // Arrange
      jest.spyOn(UserService, 'getAllUsers').mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app)
        .get('/users');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/:userId', () => {
    it('should get user by ID successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        email: 'user1@test.com',
        name: 'User 1',
        role: 'STUDENT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      jest.spyOn(UserService, 'getUserProfile').mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/users/user-1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.getUserProfile).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      jest.spyOn(UserService, 'getUserProfile').mockRejectedValue(new Error('User not found'));

      // Act
      const response = await request(app)
        .get('/users/non-existent');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:userId', () => {
    const updateData = {
      name: 'Updated Name',
      email: 'updated@test.com',
    };

    it('should update user successfully', async () => {
      // Arrange
      const updatedUser = {
        id: 'user-1',
        ...updateData,
        role: 'STUDENT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      jest.spyOn(UserService, 'updateUserProfile').mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put('/users/user-1')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.updateUserProfile).toHaveBeenCalledWith('user-1', updateData);
    });
  });

  describe('DELETE /users/:userId', () => {
    it('should delete user successfully', async () => {
      // Arrange
      jest.spyOn(UserService, 'deleteUser').mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .delete('/users/user-1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      jest.spyOn(UserService, 'deleteUser').mockRejectedValue(new Error('User not found'));

      // Act
      const response = await request(app)
        .delete('/users/non-existent');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /profile', () => {
    it('should get current user profile successfully', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        email: 'user1@test.com',
        name: 'User 1',
        role: 'STUDENT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      jest.spyOn(UserService, 'getUserProfile').mockResolvedValue(mockProfile);

      // Act
      const response = await request(app)
        .get('/profile');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.getUserProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('PUT /profile', () => {
    const updateData = {
      name: 'Updated Profile Name',
    };

    it('should update current user profile successfully', async () => {
      // Arrange
      const updatedProfile = {
        id: 'user-1',
        email: 'user1@test.com',
        name: 'Updated Profile Name',
        role: 'STUDENT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      jest.spyOn(UserService, 'updateUserProfile').mockResolvedValue(updatedProfile);

      // Act
      const response = await request(app)
        .put('/profile')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(UserService.updateUserProfile).toHaveBeenCalledWith('user-1', updateData);
    });
  });
});