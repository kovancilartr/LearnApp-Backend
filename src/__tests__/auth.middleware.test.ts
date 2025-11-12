import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.middleware';

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  it('should authenticate valid token and set user', () => {
    // Arrange
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'STUDENT',
    };
    
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };
    
    mockJwt.verify = jest.fn().mockReturnValue(mockUser);

    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
    expect(mockRequest.user).toEqual(mockUser);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 401 for missing authorization header', () => {
    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Access token is required',
        details: undefined,
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for malformed authorization header', () => {
    // Arrange
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
        details: undefined,
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid token', () => {
    // Arrange
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };
    
    mockJwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });

    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
        details: undefined,
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for expired token', () => {
    // Arrange
    mockRequest.headers = {
      authorization: 'Bearer expired-token',
    };
    
    const tokenExpiredError = new Error('Token expired');
    tokenExpiredError.name = 'TokenExpiredError';
    mockJwt.verify = jest.fn().mockImplementation(() => {
      throw tokenExpiredError;
    });

    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
        details: undefined,
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle JWT malformed error', () => {
    // Arrange
    mockRequest.headers = {
      authorization: 'Bearer malformed-token',
    };
    
    const malformedError = new Error('JWT malformed');
    malformedError.name = 'JsonWebTokenError';
    mockJwt.verify = jest.fn().mockImplementation(() => {
      throw malformedError;
    });

    // Act
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
        details: undefined,
      },
      timestamp: expect.any(String),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});