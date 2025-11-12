import { Request, Response, NextFunction } from 'express';
import { roleMiddleware } from '../middleware/role.middleware';

describe('roleMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow access for user with required role', () => {
    // Arrange
    mockRequest.user = {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    const middleware = roleMiddleware(['ADMIN']);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should allow access for user with one of multiple required roles', () => {
    // Arrange
    mockRequest.user = {
      id: 'user-1',
      email: 'teacher@example.com',
      role: 'TEACHER',
    };

    const middleware = roleMiddleware(['ADMIN', 'TEACHER']);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should deny access for user without required role', () => {
    // Arrange
    mockRequest.user = {
      id: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
    };

    const middleware = roleMiddleware(['ADMIN']);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should deny access for user without user object', () => {
    // Arrange
    mockRequest.user = undefined;

    const middleware = roleMiddleware(['ADMIN']);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle empty roles array', () => {
    // Arrange
    mockRequest.user = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'STUDENT',
    };

    const middleware = roleMiddleware([]);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should be case sensitive for roles', () => {
    // Arrange
    mockRequest.user = {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    const middleware = roleMiddleware(['admin']); // lowercase

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle parent role accessing child data', () => {
    // Arrange
    mockRequest.user = {
      id: 'parent-1',
      email: 'parent@example.com',
      role: 'PARENT',
    };

    const middleware = roleMiddleware(['PARENT', 'STUDENT']);

    // Act
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});