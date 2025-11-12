import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  updateUserProfileSchema,
  linkParentChildSchema,
  unlinkParentChildSchema,
  userSearchQuerySchema,
  userIdParamSchema,
  studentIdParamSchema,
  parentIdParamSchema,
  roleSwitchSchema,
} from '../schemas/user.schema';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Current user profile routes (detailed versions)
router.get('/profile/detailed', UserController.getCurrentUserProfile);
router.put('/profile/detailed', 
  validateRequest({ body: updateUserProfileSchema }),
  UserController.updateCurrentUserProfile
);

// Helper routes for linking (Admin only) - These routes must come before parameterized routes
router.get('/users/students-without-parent', 
  roleMiddleware(['ADMIN']),
  UserController.getStudentsWithoutParent
);

router.get('/users/all-parents', 
  roleMiddleware(['ADMIN']),
  UserController.getAllParents
);

// Parent-child relationship management (Admin only) - Must come before parameterized routes
router.post('/users/link-parent-student', 
  roleMiddleware(['ADMIN']),
  validateRequest({ body: linkParentChildSchema }),
  UserController.linkParentToStudent
);

router.post('/users/unlink-parent-student', 
  roleMiddleware(['ADMIN']),
  validateRequest({ body: unlinkParentChildSchema }),
  UserController.unlinkParentFromStudent
);

// Admin-only user management routes
router.get('/users', 
  roleMiddleware(['ADMIN']),
  validateRequest({ query: userSearchQuerySchema }),
  UserController.getAllUsers
);

router.get('/users/:userId', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.getUserProfile
);

router.get('/users/:userId/profile/detailed', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.getUserDetailedProfile
);

router.put('/users/:userId', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema, body: updateUserProfileSchema }),
  UserController.updateUserProfile
);

router.delete('/users/:userId', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.deleteUser
);



// Profile-specific routes by user ID (for admin user management)
router.get('/users/:userId/student', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.getStudentByUserId
);

router.get('/users/:userId/teacher', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.getTeacherByUserId
);

router.get('/users/:userId/parent', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: userIdParamSchema }),
  UserController.getParentByUserId
);

// Profile-specific routes by profile ID
router.get('/students/:studentId', 
  roleMiddleware(['ADMIN', 'TEACHER', 'PARENT']),
  validateRequest({ params: studentIdParamSchema }),
  UserController.getStudentProfile
);

router.get('/teachers/:teacherId', 
  roleMiddleware(['ADMIN']),
  UserController.getTeacherProfile
);

router.get('/parents/:parentId', 
  roleMiddleware(['ADMIN']),
  validateRequest({ params: parentIdParamSchema }),
  UserController.getParentProfile
);

// Role switching for parents
router.post('/switch-role', 
  roleMiddleware(['PARENT']),
  validateRequest({ body: roleSwitchSchema }),
  UserController.switchUserRole
);

export { router as userRoutes };