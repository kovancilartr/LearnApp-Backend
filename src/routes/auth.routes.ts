import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenRequestSchema,
  updatePasswordSchema,
  checkEmailSchema,
  validateTokenSchema,
  logoutSchema
} from '../schemas/auth.schema';

const router = Router();

/**
 * Public authentication routes
 */

// POST /api/auth/register - Register a new user
router.post('/register', validateRequest(registerSchema), AuthController.register);

// POST /api/auth/login - Login user
router.post('/login', validateRequest(loginSchema), AuthController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', validateRequest(refreshTokenRequestSchema), AuthController.refreshToken);

// POST /api/auth/logout - Logout user (revoke refresh token)
router.post('/logout', validateRequest(logoutSchema), AuthController.logout);

// POST /api/auth/validate-token - Validate refresh token
router.post('/validate-token', validateRequest(validateTokenSchema), AuthController.validateToken);

// POST /api/auth/check-email - Check if email exists
router.post('/check-email', validateRequest(checkEmailSchema), AuthController.checkEmail);

/**
 * Protected authentication routes (require authentication)
 */

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, AuthController.getProfile);

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', authMiddleware, AuthController.logoutAll);

// PUT /api/auth/password - Update user password
router.put('/password', authMiddleware, validateRequest(updatePasswordSchema), AuthController.updatePassword);

// GET /api/auth/active-tokens - Get user's active tokens count
router.get('/active-tokens', authMiddleware, AuthController.getActiveTokensCount);

export default router;