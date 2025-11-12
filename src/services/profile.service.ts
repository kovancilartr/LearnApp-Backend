import { prisma } from "../config/database";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "../utils/password.utils";
import {
  UserProfile,
  UpdateUserProfileRequest,
  ChangePasswordRequest,
  NotificationPreferences,
  ProfileUpdateData,
} from "../types/profile.types";

export class ProfileService {
  /**
   * Update user profile information
   */
  static async updateProfile(
    userId: string,
    data: ProfileUpdateData
  ): Promise<UserProfile> {
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
          throw new Error("Email already exists");
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
                  createdAt: "desc",
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
      console.error("ProfileService.updateProfile error:", error);
      throw error;
    }
  }

  /**
   * Change user password with security validation
   */
  static async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<void> {
    try {
      const { oldPassword, newPassword } = data;

      // Kullanıcıyı bul
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Eski şifreyi doğrula
      const isOldPasswordValid = await comparePassword(
        oldPassword,
        user.password
      );
      if (!isOldPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Yeni şifre eski şifre ile aynı olmamalı
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        throw new Error("New password must be different from current password");
      }

      // Yeni şifre güvenlik kontrolü
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Yeni şifreyi hash'le
      const hashedNewPassword = await hashPassword(newPassword);

      // Şifreyi güncelle
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Password changed successfully for user: ${userId}`);
    } catch (error) {
      console.error("ProfileService.changePassword error:", error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    try {
      // Kullanıcının mevcut tercihlerini kontrol et
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // Eğer tercihler yoksa, varsayılan tercihleri oluştur
      if (!preferences) {
        const defaultPreferences: NotificationPreferences = {
          emailNotifications: true,
          pushNotifications: true,
          enrollmentUpdates: true,
          courseUpdates: true,
          quizResults: true,
          systemAnnouncements: true,
          weeklyDigest: false,
        };

        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            preferences: defaultPreferences as any,
          },
        });
      }

      return preferences.preferences as unknown as NotificationPreferences;
    } catch (error) {
      console.error("ProfileService.getNotificationPreferences error:", error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    try {
      // Kullanıcının var olduğunu kontrol et
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Tercihleri güncelle veya oluştur
      const updatedPreferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          preferences: preferences as any,
          updatedAt: new Date(),
        },
        create: {
          userId,
          preferences: preferences as any,
        },
      });

      console.log(`✅ Notification preferences updated for user: ${userId}`);
      return updatedPreferences.preferences as unknown as NotificationPreferences;
    } catch (error) {
      console.error(
        "ProfileService.updateNotificationPreferences error:",
        error
      );
      throw error;
    }
  }

  /**
   * Get user's complete profile with preferences
   */
  static async getCompleteProfile(
    userId: string
  ): Promise<UserProfile & { preferences: NotificationPreferences }> {
    try {
      // Kullanıcı profilini al
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
                  createdAt: "desc",
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

      if (!user) {
        throw new Error("User not found");
      }

      // Bildirim tercihlerini al
      const preferences = await this.getNotificationPreferences(userId);

      return {
        ...user,
        preferences,
      } as UserProfile & { preferences: NotificationPreferences };
    } catch (error) {
      console.error("ProfileService.getCompleteProfile error:", error);
      throw error;
    }
  }

  /**
   * Validate user profile data
   */
  static validateProfileData(data: ProfileUpdateData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push("Name cannot be empty");
      } else if (data.name.trim().length < 2) {
        errors.push("Name must be at least 2 characters long");
      } else if (data.name.trim().length > 100) {
        errors.push("Name must not exceed 100 characters");
      }
    }

    // Email validation
    if (data.email !== undefined) {
      if (!data.email || data.email.trim().length === 0) {
        errors.push("Email cannot be empty");
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          errors.push("Invalid email format");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Delete user profile data (GDPR compliance)
   */
  static async deleteUserData(userId: string): Promise<void> {
    try {
      // Bu işlem çok kritik olduğu için transaction kullan
      await prisma.$transaction(async (tx) => {
        // Önce kullanıcının var olduğunu kontrol et
        const user = await tx.user.findUnique({
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
          throw new Error("User not found");
        }

        // Öğretmen ise ve kursu varsa silme işlemini engelle
        if (user.teacherProfile && user.teacherProfile.courses.length > 0) {
          throw new Error("Cannot delete teacher with assigned courses");
        }

        // Ebeveyn ise ve çocuğu varsa silme işlemini engelle
        if (user.parentProfile && user.parentProfile.children.length > 0) {
          throw new Error("Cannot delete parent with linked children");
        }

        // Kullanıcı tercihlerini sil
        await tx.userPreferences.deleteMany({
          where: { userId },
        });

        // Kullanıcıyı sil (cascade delete ile ilişkili veriler de silinecek)
        await tx.user.delete({
          where: { id: userId },
        });
      });

      console.log(`✅ User data deleted successfully for user: ${userId}`);
    } catch (error) {
      console.error("ProfileService.deleteUserData error:", error);
      throw error;
    }
  }
}
