import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  updateProfileSchema,
  changePasswordSchema,
  updateNotificationPreferencesSchema
} from '../schemas/profile.schema';

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get user's complete profile with preferences
 * @access  Private (All authenticated users)
 */
router.get(
  '/',
  authMiddleware,
  ProfileController.getProfile
);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile information
 * @access  Private (All authenticated users)
 */
router.put(
  '/',
  authMiddleware,
  validateRequest(updateProfileSchema),
  ProfileController.updateProfile
);

/**
 * @route   PUT /api/profile/password
 * @desc    Change user password
 * @access  Private (All authenticated users)
 */
router.put(
  '/password',
  authMiddleware,
  validateRequest(changePasswordSchema),
  ProfileController.changePassword
);

/**
 * @route   GET /api/profile/notifications
 * @desc    Get user notification preferences
 * @access  Private (All authenticated users)
 */
router.get(
  '/notifications',
  authMiddleware,
  ProfileController.getNotificationPreferences
);

/**
 * @route   PUT /api/profile/notifications
 * @desc    Update user notification preferences
 * @access  Private (All authenticated users)
 */
router.put(
  '/notifications',
  authMiddleware,
  validateRequest(updateNotificationPreferencesSchema),
  ProfileController.updateNotificationPreferences
);

/**
 * @route   DELETE /api/profile
 * @desc    Delete user profile data (GDPR compliance)
 * @access  Private (All authenticated users)
 */
router.delete(
  '/',
  authMiddleware,
  ProfileController.deleteProfile
);

export default router;