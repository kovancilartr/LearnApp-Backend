import { prisma } from '../config/database';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/password.utils';
import {
  UserProfile,
  UpdateUserProfileRequest,
  LinkParentChildRequest,
  UnlinkParentChildRequest,
  UserSearchQuery,
  UserListItem,
  StudentProfile,
  TeacherProfile,
  ParentProfile,
  RoleSwitchRequest
} from '../types/auth.types';
import { PaginatedResponse } from '../types/api.types';

export class UserService {
  /**
   * Get user profile by ID with role-specific data
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      console.log('🔍 UserService.getUserProfile - userId:', userId);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: {
            include: {
              parent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              enrollments: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              completions: {
                include: {
                  lesson: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
                where: {
                  completed: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 10, // Son 10 tamamlanan ders
              },
            },
          },
          teacherProfile: {
            include: {
              courses: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          parentProfile: {
            include: {
              children: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      console.log('📊 UserService.getUserProfile - user found:', user ? 'Yes' : 'No');
      console.log('📊 UserService.getUserProfile - user role:', user?.role);
      console.log('📊 UserService.getUserProfile - has studentProfile:', !!user?.studentProfile);
      console.log('📊 UserService.getUserProfile - has teacherProfile:', !!user?.teacherProfile);
      console.log('📊 UserService.getUserProfile - has parentProfile:', !!user?.parentProfile);

      if (!user) {
        console.error('❌ UserService.getUserProfile - User not found for ID:', userId);
        throw new Error('User not found');
      }

      console.log('✅ UserService.getUserProfile - returning user profile');
      return user as UserProfile;
    } catch (error) {
      console.error('❌ UserService.getUserProfile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, data: UpdateUserProfileRequest): Promise<UserProfile> {
    try {
      // Email değişikliği varsa, mevcut email kontrolü yap
      if (data.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email.toLowerCase(),
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.email && { email: data.email.toLowerCase() }),
        },
        include: {
          studentProfile: {
            include: {
              parent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          teacherProfile: {
            include: {
              courses: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  createdAt: true,
                },
              },
            },
          },
          parentProfile: {
            include: {
              children: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updatedUser as UserProfile;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination and filtering (Admin only)
   */
  static async getAllUsers(query: UserSearchQuery): Promise<PaginatedResponse<UserListItem>> {
    try {
      const { search, role, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            studentProfile: {
              select: { id: true },
            },
            teacherProfile: {
              select: { id: true },
            },
            parentProfile: {
              select: { id: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const items: UserListItem[] = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        profileId: user.studentProfile?.id || user.teacherProfile?.id || user.parentProfile?.id,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          teacherProfile: {
            include: {
              courses: true,
            },
          },
          parentProfile: {
            include: {
              children: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Öğretmen ise ve kursu varsa silme işlemini engelle
      if (user.teacherProfile && user.teacherProfile.courses.length > 0) {
        throw new Error('Cannot delete teacher with assigned courses');
      }

      // Ebeveyn ise ve çocuğu varsa silme işlemini engelle
      if (user.parentProfile && user.parentProfile.children.length > 0) {
        throw new Error('Cannot delete parent with linked children');
      }

      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  /**
   * Link parent to student
   */
  static async linkParentToStudent(data: LinkParentChildRequest): Promise<void> {
    try {
      const { parentId, studentId } = data;

      // Ebeveyn ve öğrenci profillerinin varlığını kontrol et
      const [parent, student] = await Promise.all([
        prisma.parent.findUnique({
          where: { userId: parentId },
        }),
        prisma.student.findUnique({
          where: { id: studentId },
          include: {
            parent: true,
          },
        }),
      ]);

      if (!parent) {
        throw new Error('Parent profile not found');
      }

      if (!student) {
        throw new Error('Student profile not found');
      }

      if (student.parent) {
        throw new Error('Student already has a linked parent');
      }

      // Öğrenciyi ebeveyne bağla
      await prisma.student.update({
        where: { id: studentId },
        data: { parentId: parent.id },
      });
    } catch (error) {
      console.error('Link parent to student error:', error);
      throw error;
    }
  }

  /**
   * Unlink parent from student
   */
  static async unlinkParentFromStudent(data: UnlinkParentChildRequest): Promise<void> {
    try {
      const { studentId } = data;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          parent: true,
        },
      });

      if (!student) {
        throw new Error('Student profile not found');
      }

      if (!student.parent) {
        throw new Error('Student does not have a linked parent');
      }

      // Ebeveyn bağlantısını kaldır
      await prisma.student.update({
        where: { id: studentId },
        data: { parentId: null },
      });
    } catch (error) {
      console.error('Unlink parent from student error:', error);
      throw error;
    }
  }

  /**
   * Get student profile by user ID (finds student profile automatically)
   */
  static async getStudentByUserId(userId: string): Promise<StudentProfile> {
    try {
      const student = await prisma.student.findFirst({
        where: { userId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          completions: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            where: {
              completed: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!student) {
        throw new Error('Student profile not found');
      }

      return student as StudentProfile;
    } catch (error) {
      console.error('Get student by user ID error:', error);
      throw error;
    }
  }

  /**
   * Get student profile by student ID
   */
  static async getStudentProfile(studentId: string): Promise<StudentProfile> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          completions: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            where: {
              completed: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!student) {
        throw new Error('Student profile not found');
      }

      return student as StudentProfile;
    } catch (error) {
      console.error('Get student profile error:', error);
      throw error;
    }
  }

  /**
   * Get teacher profile by user ID (finds teacher profile automatically)
   */
  static async getTeacherByUserId(userId: string): Promise<TeacherProfile> {
    try {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          courses: {
            select: {
              id: true,
              title: true,
              description: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!teacher) {
        throw new Error('Teacher profile not found');
      }

      return teacher as TeacherProfile;
    } catch (error) {
      console.error('Get teacher by user ID error:', error);
      throw error;
    }
  }

  /**
   * Get teacher profile by teacher ID
   */
  static async getTeacherProfile(teacherId: string): Promise<TeacherProfile> {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          courses: {
            select: {
              id: true,
              title: true,
              description: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!teacher) {
        throw new Error('Teacher profile not found');
      }

      return teacher as TeacherProfile;
    } catch (error) {
      console.error('Get teacher profile error:', error);
      throw error;
    }
  }

  /**
   * Get parent profile by user ID (finds parent profile automatically)
   */
  static async getParentByUserId(userId: string): Promise<ParentProfile> {
    try {
      const parent = await prisma.parent.findFirst({
        where: { userId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          children: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error('Parent profile not found');
      }

      return parent as ParentProfile;
    } catch (error) {
      console.error('Get parent by user ID error:', error);
      throw error;
    }
  }

  /**
   * Get parent profile by parent ID
   */
  static async getParentProfile(parentId: string): Promise<ParentProfile> {
    try {
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          children: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new Error('Parent profile not found');
      }

      return parent as ParentProfile;
    } catch (error) {
      console.error('Get parent profile error:', error);
      throw error;
    }
  }

  /**
   * Get all students without parent (for linking purposes)
   */
  static async getStudentsWithoutParent(): Promise<StudentProfile[]> {
    try {
      const students = await prisma.student.findMany({
        where: {
          parentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      return students as StudentProfile[];
    } catch (error) {
      console.error('Get students without parent error:', error);
      throw error;
    }
  }

  /**
   * Get all parents (for linking purposes)
   */
  static async getAllParents(): Promise<ParentProfile[]> {
    try {
      const parents = await prisma.parent.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          children: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      return parents as ParentProfile[];
    } catch (error) {
      console.error('Get all parents error:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by ID
   */
  static async userExists(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error('Check user exists error:', error);
      return false;
    }
  }

  /**
   * Get user role by ID
   */
  static async getUserRole(userId: string): Promise<Role | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role || null;
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  /**
   * Switch user role (for parents only)
   * Parents can switch between PARENT and STUDENT roles
   */
  static async switchUserRole(userId: string, switchData: { targetRole: Role; childId?: string }): Promise<UserProfile> {
    try {
      // Get current user
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          parentProfile: {
            include: {
              children: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Only parents can switch roles
      if (currentUser.role !== Role.PARENT) {
        throw new Error('Only parents can switch roles');
      }

      // Validate target role
      if (switchData.targetRole !== Role.PARENT && switchData.targetRole !== Role.STUDENT) {
        throw new Error('Parents can only switch between PARENT and STUDENT roles');
      }

      // If switching to STUDENT role, validate child ID
      if (switchData.targetRole === Role.STUDENT) {
        if (!switchData.childId) {
          throw new Error('Child ID is required when switching to STUDENT role');
        }

        // Check if the child belongs to this parent
        const parentProfile = currentUser.parentProfile;
        if (!parentProfile) {
          throw new Error('Parent profile not found');
        }

        const childExists = parentProfile.children.some(child => child.id === switchData.childId);
        if (!childExists) {
          throw new Error('Child not found or does not belong to this parent');
        }
      }

      // Update user role (this is temporary for the session, not permanent)
      // In a real implementation, you might want to use a session-based approach
      // For now, we'll return the user profile with the switched context
      const switchedProfile = await this.getUserProfile(userId);
      
      // Add switched context information
      const result = {
        ...switchedProfile,
        switchedRole: switchData.targetRole,
        switchedChildId: switchData.childId,
      };

      return result as UserProfile;
    } catch (error) {
      console.error('Switch user role error:', error);
      throw error;
    }
  }


}