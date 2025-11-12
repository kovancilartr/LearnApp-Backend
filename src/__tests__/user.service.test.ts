// Mock Prisma client first
jest.mock("@prisma/client", () => ({
  Role: {
    STUDENT: "STUDENT",
    TEACHER: "TEACHER",
    PARENT: "PARENT",
    ADMIN: "ADMIN",
  },
}));

import { Role } from "@prisma/client";

// Simple mock for testing
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  teacher: {
    findUnique: jest.fn(),
  },
  parent: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

// Mock the database module
jest.mock("../config/database", () => ({
  prisma: mockPrisma,
}));

import { UserService } from "../services/user.service";

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("should return user profile with role-specific data", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: Role.STUDENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        studentProfile: {
          id: "student-1",
          userId: "user-1",
          parentId: null,
          parent: null,
          enrollments: [],
          completions: [],
        },
        teacherProfile: null,
        parentProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserProfile("user-1");

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        include: expect.objectContaining({
          studentProfile: expect.any(Object),
          teacherProfile: expect.any(Object),
          parentProfile: expect.any(Object),
        }),
      });
    });

    it("should throw error if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getUserProfile("non-existent")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile successfully", async () => {
      const mockUpdatedUser = {
        id: "user-1",
        email: "updated@example.com",
        name: "Updated Name",
        role: Role.STUDENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        studentProfile: null,
        teacherProfile: null,
        parentProfile: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user with same email
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateUserProfile("user-1", {
        name: "Updated Name",
        email: "updated@example.com",
      });

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          name: "Updated Name",
          email: "updated@example.com",
        },
        include: expect.any(Object),
      });
    });

    it("should throw error if email already exists", async () => {
      const existingUser = { id: "other-user", email: "existing@example.com" };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        UserService.updateUserProfile("user-1", {
          email: "existing@example.com",
        })
      ).rejects.toThrow("Email already exists");
    });
  });

  describe("linkParentToStudent", () => {
    it("should link parent to student successfully", async () => {
      const mockParent = { id: "parent-1" };
      const mockStudent = { id: "student-1", parent: null };

      mockPrisma.parent.findUnique.mockResolvedValue(mockParent);
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);
      mockPrisma.student.update.mockResolvedValue({
        ...mockStudent,
        parentId: "parent-1",
      });

      await UserService.linkParentToStudent({
        parentId: "parent-1",
        studentId: "student-1",
      });

      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: "student-1" },
        data: { parentId: "parent-1" },
      });
    });

    it("should throw error if parent not found", async () => {
      mockPrisma.parent.findUnique.mockResolvedValue(null);

      await expect(
        UserService.linkParentToStudent({
          parentId: "non-existent",
          studentId: "student-1",
        })
      ).rejects.toThrow("Parent profile not found");
    });

    it("should throw error if student already has parent", async () => {
      const mockParent = { id: "parent-1" };
      const mockStudent = {
        id: "student-1",
        parent: { id: "existing-parent" },
      };

      mockPrisma.parent.findUnique.mockResolvedValue(mockParent);
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(
        UserService.linkParentToStudent({
          parentId: "parent-1",
          studentId: "student-1",
        })
      ).rejects.toThrow("Student already has a linked parent");
    });
  });

  describe("unlinkParentFromStudent", () => {
    it("should unlink parent from student successfully", async () => {
      const mockStudent = {
        id: "student-1",
        parent: { id: "parent-1" },
      };

      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);
      mockPrisma.student.update.mockResolvedValue({
        ...mockStudent,
        parentId: null,
      });

      await UserService.unlinkParentFromStudent({ studentId: "student-1" });

      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: "student-1" },
        data: { parentId: null },
      });
    });

    it("should throw error if student does not have parent", async () => {
      const mockStudent = { id: "student-1", parent: null };
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);

      await expect(
        UserService.unlinkParentFromStudent({ studentId: "student-1" })
      ).rejects.toThrow("Student does not have a linked parent");
    });
  });

  describe("getAllUsers", () => {
    it("should return paginated users list", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "user1@example.com",
          name: "User 1",
          role: Role.STUDENT,
          createdAt: new Date(),
          studentProfile: { id: "student-1" },
          teacherProfile: null,
          parentProfile: null,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await UserService.getAllUsers({
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it("should filter users by role", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await UserService.getAllUsers({
        role: Role.TEACHER,
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.TEACHER },
        })
      );
    });

    it("should search users by name or email", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await UserService.getAllUsers({
        search: "john",
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: "john", mode: "insensitive" } },
              { email: { contains: "john", mode: "insensitive" } },
            ],
          },
        })
      );
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      const mockUser = {
        id: "user-1",
        teacherProfile: null,
        parentProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await UserService.deleteUser("user-1");

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("should throw error if teacher has courses", async () => {
      const mockUser = {
        id: "user-1",
        teacherProfile: {
          courses: [{ id: "course-1" }],
        },
        parentProfile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(UserService.deleteUser("user-1")).rejects.toThrow(
        "Cannot delete teacher with assigned courses"
      );
    });

    it("should throw error if parent has children", async () => {
      const mockUser = {
        id: "user-1",
        teacherProfile: null,
        parentProfile: {
          children: [{ id: "student-1" }],
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(UserService.deleteUser("user-1")).rejects.toThrow(
        "Cannot delete parent with linked children"
      );
    });
  });

  describe("userExists", () => {
    it("should return true if user exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });

      const result = await UserService.userExists("user-1");

      expect(result).toBe(true);
    });

    it("should return false if user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.userExists("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("getUserRole", () => {
    it("should return user role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.TEACHER });

      const result = await UserService.getUserRole("user-1");

      expect(result).toBe(Role.TEACHER);
    });

    it("should return null if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.getUserRole("non-existent");

      expect(result).toBe(null);
    });
  });
});
