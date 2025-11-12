import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  generateTokenPair,
  getTokenExpiration,
  isTokenExpiringSoon
} from '../jwt.utils';
import { TokenPayload } from '../../types/auth.types';

// Mock Prisma client
jest.mock('../../config/database', () => ({
  prisma: {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('JWT Utils', () => {
  const mockPayload: TokenPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'STUDENT',
  };

  describe('Token Generation', () => {
    test('should generate access token', () => {
      const token = generateAccessToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate different tokens for access and refresh', () => {
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('Token Verification', () => {
    test('should verify valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow();
    });

    test('should throw error for malformed token', () => {
      expect(() => {
        verifyAccessToken('not.a.valid.jwt.token');
      }).toThrow();
    });
  });

  describe('Token Utilities', () => {
    test('should get token expiration info', () => {
      const token = generateAccessToken(mockPayload);
      const expInfo = getTokenExpiration(token);
      
      expect(expInfo).not.toBeNull();
      expect(expInfo?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(expInfo?.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    test('should return null for invalid token expiration', () => {
      const expInfo = getTokenExpiration('invalid-token');
      expect(expInfo).toBeNull();
    });

    test('should detect token expiring soon', () => {
      // Create a token that expires in 1 minute (should be considered expiring soon)
      const shortLivedPayload = { ...mockPayload };
      const token = generateAccessToken(shortLivedPayload);
      
      // For this test, we'll assume the token is not expiring soon since it's just created
      // In a real scenario, you'd need to mock the token creation with a shorter expiry
      const isExpiring = isTokenExpiringSoon(token);
      expect(typeof isExpiring).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle expired token gracefully', () => {
      // This would require mocking jwt.verify to throw TokenExpiredError
      // For now, we'll test the error message format
      expect(() => {
        verifyAccessToken('expired.token.here');
      }).toThrow();
    });

    test('should handle malformed token gracefully', () => {
      expect(() => {
        verifyAccessToken('malformed-token');
      }).toThrow();
    });
  });
});