import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../config/database';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return (jwt as any).sign(payload, jwtConfig.accessTokenSecret, {
    expiresIn: jwtConfig.accessTokenExpiry,
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return (jwt as any).sign(payload, jwtConfig.refreshTokenSecret, {
    expiresIn: jwtConfig.refreshTokenExpiry,
  });
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return (jwt as any).verify(token, jwtConfig.accessTokenSecret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return (jwt as any).verify(token, jwtConfig.refreshTokenSecret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = async (payload: TokenPayload): Promise<TokenPair> => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in database
  await storeRefreshToken(refreshToken, payload.userId);

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Store refresh token in database
 */
export const storeRefreshToken = async (token: string, userId: string): Promise<void> => {
  try {
    // Calculate expiration date based on JWT config
    const expiresAt = new Date();
    const refreshExpiry = jwtConfig.refreshTokenExpiry;
    
    // Parse expiry string (e.g., "7d", "24h", "60m")
    const match = refreshExpiry.match(/^(\d+)([dhm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
      }
    } else {
      // Default to 7 days if parsing fails
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Validate refresh token exists in database and is not expired
 */
export const validateRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      return false;
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating refresh token:', error);
    return false;
  }
};

/**
 * Refresh access token using valid refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
  try {
    // Verify refresh token JWT
    const payload = verifyRefreshToken(refreshToken);
    
    // Validate token exists in database
    const isValid = await validateRefreshToken(refreshToken);
    if (!isValid) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new token pair
    const newTokenPair = await generateTokenPair(payload);

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    return newTokenPair;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  try {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    throw new Error('Failed to revoke refresh token');
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  try {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  } catch (error) {
    console.error('Error revoking all refresh tokens:', error);
    throw new Error('Failed to revoke all refresh tokens');
  }
};

/**
 * Clean up expired refresh tokens (should be run periodically)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    console.log(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw new Error('Failed to cleanup expired tokens');
  }
};

/**
 * Get token expiration info
 */
export const getTokenExpiration = (token: string): { exp: number; iat: number } | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp && decoded.iat) {
      return {
        exp: decoded.exp,
        iat: decoded.iat,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is about to expire (within 5 minutes)
 */
export const isTokenExpiringSoon = (token: string): boolean => {
  const expInfo = getTokenExpiration(token);
  if (!expInfo) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expInfo.exp - now;
  
  // Return true if token expires within 5 minutes (300 seconds)
  return timeUntilExpiry <= 300;
};