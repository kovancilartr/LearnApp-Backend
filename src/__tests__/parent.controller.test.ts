import { Request, Response } from 'express';
import { ParentController } from '../controllers/parent.controller';
import { ParentService } from '../services/parent.service';
import { AuthenticatedRequest } from '../types/auth.types';

// Mock ParentService
jest.mock('../services/parent.service');

describe('ParentController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: {
        id: 'user-1',
        role: 'PARENT',
        email: 'parent@example.com',
      },
      params: {},
      query: {},
      body: {},
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getChildrenProfiles', () => {
    it('should return children profiles for authenticated parent', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          name: 'Child One',
          email: 'child1@example.com',
          enrolledCourses: [],
          recentActivity: [],
        },
      ];

      (ParentService.getChildrenProfiles as jest.Mock).mockResolvedValue(mockChildren);

      await ParentController.getChildrenProfiles(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getChildrenProfiles).toHaveBeenCalledWith('user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          children: mockChildren,
          count: 1,
        },
      });
    });

    it('should return 403 for non-parent users', async () => {
      mockRequest.user!.role = 'STUDENT';

      await ParentController.getChildrenProfiles(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only parents can access children profiles',
        },
      });
    });

    it('should handle service errors', async () => {
      (ParentService.getChildrenProfiles as jest.Mock).mockRejectedValue(new Error('Service error'));

      await ParentController.getChildrenProfiles(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Service error',
        },
      });
    });
  });

  describe('getChildProgress', () => {
    it('should return child progress for valid request', async () => {
      const mockProgress = {
        studentId: 'child-1',
        studentName: 'Child One',
        totalCourses: 2,
        completedCourses: 1,
        overallProgress: 50,
        courseProgress: [],
        recentQuizResults: [],
        upcomingDeadlines: [],
      };

      mockRequest.params = { childId: 'child-1' };
      (ParentService.getChildProgress as jest.Mock).mockResolvedValue(mockProgress);

      await ParentController.getChildProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getChildProgress).toHaveBeenCalledWith('user-1', 'child-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockProgress,
      });
    });

    it('should return 400 if childId is missing', async () => {
      mockRequest.params = {};

      await ParentController.getChildProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Child ID is required',
        },
      });
    });

    it('should return 403 for unauthorized access', async () => {
      mockRequest.params = { childId: 'child-1' };
      (ParentService.getChildProgress as jest.Mock).mockRejectedValue(new Error('Child does not belong to this parent'));

      await ParentController.getChildProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Child does not belong to this parent',
        },
      });
    });
  });

  describe('getChildQuizResults', () => {
    it('should return quiz results for child', async () => {
      const mockQuizResults = [
        {
          id: 'attempt-1',
          quizTitle: 'Math Quiz',
          score: 8,
          maxScore: 10,
          percentage: 80,
          completedAt: new Date(),
        },
      ];

      mockRequest.params = { childId: 'child-1' };
      mockRequest.query = { limit: '5' };
      (ParentService.getChildQuizResults as jest.Mock).mockResolvedValue(mockQuizResults);

      await ParentController.getChildQuizResults(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getChildQuizResults).toHaveBeenCalledWith('user-1', 'child-1', 5);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          quizResults: mockQuizResults,
          count: 1,
        },
      });
    });
  });

  describe('createEnrollmentRequestForChild', () => {
    it('should create enrollment request for child', async () => {
      const mockEnrollmentRequest = {
        id: 'request-1',
        studentId: 'child-1',
        courseId: 'course-1',
        status: 'PENDING',
      };

      mockRequest.params = { childId: 'child-1' };
      mockRequest.body = { courseId: 'course-1', message: 'Test message' };
      (ParentService.createEnrollmentRequestForChild as jest.Mock).mockResolvedValue(mockEnrollmentRequest);

      await ParentController.createEnrollmentRequestForChild(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.createEnrollmentRequestForChild).toHaveBeenCalledWith('user-1', 'child-1', 'course-1', 'Test message');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockEnrollmentRequest,
        message: 'Enrollment request created successfully',
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.params = { childId: 'child-1' };
      mockRequest.body = {}; // Missing courseId

      await ParentController.createEnrollmentRequestForChild(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Child ID and Course ID are required',
        },
      });
    });

    it('should handle validation errors from service', async () => {
      mockRequest.params = { childId: 'child-1' };
      mockRequest.body = { courseId: 'course-1' };
      (ParentService.createEnrollmentRequestForChild as jest.Mock).mockRejectedValue(new Error('Child is already enrolled in this course'));

      await ParentController.createEnrollmentRequestForChild(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Child is already enrolled in this course',
        },
      });
    });
  });

  describe('getChildrenEnrollmentRequests', () => {
    it('should return enrollment requests for all children', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          studentId: 'child-1',
          courseId: 'course-1',
          status: 'PENDING',
        },
      ];

      (ParentService.getChildrenEnrollmentRequests as jest.Mock).mockResolvedValue(mockRequests);

      await ParentController.getChildrenEnrollmentRequests(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getChildrenEnrollmentRequests).toHaveBeenCalledWith('user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          enrollmentRequests: mockRequests,
          count: 1,
        },
      });
    });
  });

  describe('getChildNotifications', () => {
    it('should return notifications for child', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          title: 'Quiz Completed',
          message: 'You completed the math quiz',
          read: false,
        },
      ];

      mockRequest.params = { childId: 'child-1' };
      mockRequest.query = { limit: '10' };
      (ParentService.getChildNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      await ParentController.getChildNotifications(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getChildNotifications).toHaveBeenCalledWith('user-1', 'child-1', 10);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          notifications: mockNotifications,
          count: 1,
        },
      });
    });
  });

  describe('getParentDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      const mockSummary = {
        totalChildren: 2,
        totalCourses: 4,
        totalCompletedCourses: 1,
        averageProgress: 65,
        recentActivity: [],
        upcomingDeadlines: [],
      };

      (ParentService.getParentDashboardSummary as jest.Mock).mockResolvedValue(mockSummary);

      await ParentController.getParentDashboardSummary(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ParentService.getParentDashboardSummary).toHaveBeenCalledWith('user-1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });
});