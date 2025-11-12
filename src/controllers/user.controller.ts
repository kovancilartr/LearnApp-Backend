import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { UserService } from "../services/user.service";
import { AuthService } from "../services/auth.service";
import {
  updateUserProfileSchema,
  linkParentChildSchema,
  unlinkParentChildSchema,
  userSearchQuerySchema,
  userIdParamSchema,
  studentIdParamSchema,
  parentIdParamSchema,
  roleSwitchSchema,
} from "../schemas/user.schema";
import { ApiResponse } from "../types/api.types";
import { serializeUserProfile } from "../utils/serializers";

export class UserController {
  /**
   * Get current user profile (detailed version)
   */
  static async getCurrentUserProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userProfile = await UserService.getUserProfile(userId);
      const serializedProfile = serializeUserProfile(userProfile);

      res.json({
        success: true,
        data: serializedProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get current user profile error:", error);
      res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: error.message || "User not found",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get user profile by ID (Admin only)
   */
  static async getUserProfile(req: Request, res: Response) {
    console.log("❌ getUserProfile endpoint called with params:", req.params);
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const userProfile = await UserService.getUserProfile(userId);

      const serializedProfile = serializeUserProfile(userProfile);
      res.json({
        success: true,
        data: serializedProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get user profile error:", error);
      const statusCode = error.message === "User not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "USER_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get user profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get user detailed profile by ID (Admin only)
   */
  static async getUserDetailedProfile(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      console.log("🔍 getUserDetailedProfile controller - userId:", userId);

      const userProfile = await UserService.getUserProfile(userId);
      console.log(
        "📊 getUserDetailedProfile controller - userProfile:",
        userProfile ? "Found" : "Not found"
      );

      if (!userProfile) {
        console.error(
          "❌ getUserDetailedProfile controller - userProfile is null/undefined"
        );
        throw new Error("User profile not found");
      }

      const response = {
        success: true,
        data: userProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse;

      console.log("✅ getUserDetailedProfile controller - sending response");
      res.json(response);
    } catch (error: any) {
      console.error("Get user detailed profile error:", error);
      const statusCode = error.message === "User not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "USER_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get user detailed profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUserProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const updateData = updateUserProfileSchema.parse(req.body);
      const updatedProfile = await UserService.updateUserProfile(
        userId,
        updateData
      );

      res.json({
        success: true,
        data: updatedProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Update current user profile error:", error);
      const statusCode = error.message === "Email already exists" ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 409 ? "EMAIL_EXISTS" : "VALIDATION_ERROR",
          message: error.message || "Failed to update profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Update user profile by ID (Admin only)
   */
  static async updateUserProfile(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const updateData = updateUserProfileSchema.parse(req.body);
      const updatedProfile = await UserService.updateUserProfile(
        userId,
        updateData
      );

      res.json({
        success: true,
        data: updatedProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Update user profile error:", error);
      const statusCode =
        error.message === "Email already exists"
          ? 409
          : error.message === "User not found"
          ? 404
          : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code:
            statusCode === 409
              ? "EMAIL_EXISTS"
              : statusCode === 404
              ? "USER_NOT_FOUND"
              : "VALIDATION_ERROR",
          message: error.message || "Failed to update profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get all users with pagination (Admin only)
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const query = userSearchQuerySchema.parse(req.query);
      const users = await UserService.getAllUsers(query);

      // Serialize users data to convert Date fields to strings
      const serializedUsers = {
        ...users,
        items: users.items.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        })),
      };

      res.json({
        success: true,
        data: serializedUsers,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get all users error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message || "Failed to get users",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      await UserService.deleteUser(userId);

      res.json({
        success: true,
        data: { message: "User deleted successfully" },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Delete user error:", error);
      const statusCode =
        error.message === "User not found"
          ? 404
          : error.message.includes("Cannot delete")
          ? 409
          : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code:
            statusCode === 404
              ? "USER_NOT_FOUND"
              : statusCode === 409
              ? "DELETE_CONFLICT"
              : "VALIDATION_ERROR",
          message: error.message || "Failed to delete user",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Link parent to student (Admin only)
   */
  static async linkParentToStudent(req: Request, res: Response) {
    console.log("🔗 linkParentToStudent endpoint called with body:", req.body);
    try {
      const linkData = linkParentChildSchema.parse(req.body);
      await UserService.linkParentToStudent(linkData);

      res.json({
        success: true,
        data: { message: "Parent linked to student successfully" },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Link parent to student error:", error);
      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("already has")
        ? 409
        : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code:
            statusCode === 404
              ? "PROFILE_NOT_FOUND"
              : statusCode === 409
              ? "ALREADY_LINKED"
              : "VALIDATION_ERROR",
          message: error.message || "Failed to link parent to student",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Unlink parent from student (Admin only)
   */
  static async unlinkParentFromStudent(req: Request, res: Response) {
    try {
      const unlinkData = unlinkParentChildSchema.parse(req.body);
      await UserService.unlinkParentFromStudent(unlinkData);

      res.json({
        success: true,
        data: { message: "Parent unlinked from student successfully" },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Unlink parent from student error:", error);
      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("does not have")
        ? 409
        : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code:
            statusCode === 404
              ? "PROFILE_NOT_FOUND"
              : statusCode === 409
              ? "NOT_LINKED"
              : "VALIDATION_ERROR",
          message: error.message || "Failed to unlink parent from student",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get student profile by user ID
   */
  static async getStudentByUserId(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const studentProfile = await UserService.getStudentByUserId(userId);

      res.json({
        success: true,
        data: studentProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get student by user ID error:", error);
      const statusCode =
        error.message === "Student profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "STUDENT_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get student profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get student profile by ID
   */
  static async getStudentProfile(req: Request, res: Response) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const studentProfile = await UserService.getStudentProfile(studentId);

      res.json({
        success: true,
        data: studentProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get student profile error:", error);
      const statusCode =
        error.message === "Student profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "STUDENT_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get student profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get teacher profile by user ID
   */
  static async getTeacherByUserId(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const teacherProfile = await UserService.getTeacherByUserId(userId);

      res.json({
        success: true,
        data: teacherProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get teacher by user ID error:", error);
      const statusCode =
        error.message === "Teacher profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "TEACHER_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get teacher profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get teacher profile by ID
   */
  static async getTeacherProfile(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;
      const teacherProfile = await UserService.getTeacherProfile(teacherId);

      res.json({
        success: true,
        data: teacherProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get teacher profile error:", error);
      const statusCode =
        error.message === "Teacher profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "TEACHER_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get teacher profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get parent profile by user ID
   */
  static async getParentByUserId(req: Request, res: Response) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const parentProfile = await UserService.getParentByUserId(userId);

      res.json({
        success: true,
        data: parentProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get parent by user ID error:", error);
      const statusCode =
        error.message === "Parent profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "PARENT_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get parent profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get parent profile by ID
   */
  static async getParentProfile(req: Request, res: Response) {
    try {
      const { parentId } = parentIdParamSchema.parse(req.params);
      const parentProfile = await UserService.getParentProfile(parentId);

      res.json({
        success: true,
        data: parentProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get parent profile error:", error);
      const statusCode =
        error.message === "Parent profile not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? "PARENT_NOT_FOUND" : "VALIDATION_ERROR",
          message: error.message || "Failed to get parent profile",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get students without parent (for linking purposes)
   */
  static async getStudentsWithoutParent(req: Request, res: Response) {
    console.log("🎯 getStudentsWithoutParent endpoint called!");
    try {
      const students = await UserService.getStudentsWithoutParent();

      res.json({
        success: true,
        data: students,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get students without parent error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get students without parent",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Get all parents (for linking purposes)
   */
  static async getAllParents(req: Request, res: Response) {
    try {
      const parents = await UserService.getAllParents();

      res.json({
        success: true,
        data: parents,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Get all parents error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get parents",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  /**
   * Switch user role (for parents only)
   */
  static async switchUserRole(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const switchData = roleSwitchSchema.parse(req.body);
      const switchedProfile = await UserService.switchUserRole(
        userId,
        switchData
      );

      res.json({
        success: true,
        data: switchedProfile,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error: any) {
      console.error("Switch user role error:", error);
      const statusCode =
        error.message === "User not found"
          ? 404
          : error.message.includes("Only parents")
          ? 403
          : error.message.includes("Child not found")
          ? 404
          : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code:
            statusCode === 404
              ? "NOT_FOUND"
              : statusCode === 403
              ? "FORBIDDEN"
              : "VALIDATION_ERROR",
          message: error.message || "Failed to switch user role",
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}
