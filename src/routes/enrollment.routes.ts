import { Router } from "express";
import { EnrollmentController } from "../controllers/enrollment.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";

const router = Router();

// All enrollment routes require authentication
router.use(authMiddleware);

// Student routes
router.post("/requests", 
  roleMiddleware(['STUDENT']),
  EnrollmentController.createEnrollmentRequest
);
router.get("/my/requests", 
  roleMiddleware(['STUDENT']),
  EnrollmentController.getMyEnrollmentRequests
);
router.get("/my", 
  roleMiddleware(['STUDENT']),
  EnrollmentController.getMyEnrollments
);

// Admin routes
router.get(
  "/requests",
  roleMiddleware(['ADMIN']),
  EnrollmentController.getEnrollmentRequests
);
router.get(
  "/requests/count/pending",
  roleMiddleware(['ADMIN']),
  EnrollmentController.getPendingRequestsCount
);
router.get(
  "/requests/statistics",
  roleMiddleware(['ADMIN']),
  EnrollmentController.getEnrollmentRequestStatistics
);
router.get(
  "/requests/:requestId",
  roleMiddleware(['ADMIN', 'STUDENT']),
  EnrollmentController.getEnrollmentRequestById
);

router.post(
  "/requests/bulk-process",
  roleMiddleware(['ADMIN']),
  EnrollmentController.bulkProcessEnrollmentRequests
);
router.post(
  "/requests/:requestId/approve",
  roleMiddleware(['ADMIN']),
  EnrollmentController.approveEnrollmentRequest
);
router.post(
  "/requests/:requestId/reject",
  roleMiddleware(['ADMIN']),
  EnrollmentController.rejectEnrollmentRequest
);

router.delete(
  "/requests/:requestId",
  roleMiddleware(['ADMIN']),
  EnrollmentController.deleteEnrollmentRequest
);

export default router;
