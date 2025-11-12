import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';
import {
  NotificationData,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationQuery,
  NotificationStats,
  BulkNotificationRequest,
  NotificationCleanupOptions
} from '../types/notification.types';
import { PaginatedResponse } from '../types/api.types';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationRequest): Promise<NotificationData> {
    try {
      console.log('🔔 NotificationService.createNotification - data:', data);

      // Kullanıcının var olduğunu kontrol et
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true }
      });

      if (!userExists) {
        throw new Error('User not found');
      }

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
        },
      });

      console.log('✅ NotificationService.createNotification - notification created:', notification.id);
      return notification as NotificationData;
    } catch (error) {
      console.error('❌ NotificationService.createNotification error:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications for multiple users
   */
  static async createBulkNotifications(data: BulkNotificationRequest): Promise<NotificationData[]> {
    try {
      console.log('🔔 NotificationService.createBulkNotifications - userIds count:', data.userIds.length);

      // Kullanıcıların var olduğunu kontrol et
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: data.userIds } },
        select: { id: true }
      });

      const existingUserIds = existingUsers.map(user => user.id);
      const invalidUserIds = data.userIds.filter(id => !existingUserIds.includes(id));

      if (invalidUserIds.length > 0) {
        console.warn('⚠️ NotificationService.createBulkNotifications - invalid user IDs:', invalidUserIds);
      }

      // Sadece geçerli kullanıcılar için bildirim oluştur
      const notificationData = existingUserIds.map(userId => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
      }));

      const notifications = await prisma.notification.createMany({
        data: notificationData,
      });

      console.log('✅ NotificationService.createBulkNotifications - notifications created:', notifications.count);

      // Oluşturulan bildirimleri getir
      const createdNotifications = await prisma.notification.findMany({
        where: {
          userId: { in: existingUserIds },
          title: data.title,
          message: data.message,
          type: data.type,
        },
        orderBy: { createdAt: 'desc' },
        take: notifications.count,
      });

      return createdNotifications as NotificationData[];
    } catch (error) {
      console.error('❌ NotificationService.createBulkNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(query: NotificationQuery): Promise<PaginatedResponse<NotificationData>> {
    try {
      const { userId, read, type, page = 1, limit = 20 } = query;
      const skip = (page - 1) * limit;

      console.log('🔍 NotificationService.getUserNotifications - query:', query);

      const where: any = { userId };

      if (read !== undefined) {
        where.read = read;
      }

      if (type) {
        where.type = type;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      console.log('📊 NotificationService.getUserNotifications - found:', notifications.length, 'total:', total);

      return {
        items: notifications as NotificationData[],
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
      console.error('❌ NotificationService.getUserNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  static async getNotificationById(notificationId: string, userId: string): Promise<NotificationData> {
    try {
      console.log('🔍 NotificationService.getNotificationById - id:', notificationId, 'userId:', userId);

      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId, // Kullanıcının sadece kendi bildirimlerini görmesini sağla
        },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      console.log('✅ NotificationService.getNotificationById - notification found');
      return notification as NotificationData;
    } catch (error) {
      console.error('❌ NotificationService.getNotificationById error:', error);
      throw error;
    }
  }

  /**
   * Update notification (mark as read/unread)
   */
  static async updateNotification(
    notificationId: string,
    userId: string,
    data: UpdateNotificationRequest
  ): Promise<NotificationData> {
    try {
      console.log('🔄 NotificationService.updateNotification - id:', notificationId, 'data:', data);

      // Bildirimin kullanıcıya ait olduğunu kontrol et
      const existingNotification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data,
      });

      console.log('✅ NotificationService.updateNotification - notification updated');
      return updatedNotification as NotificationData;
    } catch (error) {
      console.error('❌ NotificationService.updateNotification error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationData> {
    return this.updateNotification(notificationId, userId, { read: true });
  }

  /**
   * Mark notification as unread
   */
  static async markAsUnread(notificationId: string, userId: string): Promise<NotificationData> {
    return this.updateNotification(notificationId, userId, { read: false });
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      console.log('🔄 NotificationService.markAllAsRead - userId:', userId);

      const result = await prisma.notification.updateMany({
        where: {
          userId: userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      console.log('✅ NotificationService.markAllAsRead - marked as read:', result.count);
      return { count: result.count };
    } catch (error) {
      console.error('❌ NotificationService.markAllAsRead error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      console.log('🗑️ NotificationService.deleteNotification - id:', notificationId, 'userId:', userId);

      // Bildirimin kullanıcıya ait olduğunu kontrol et
      const existingNotification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      console.log('✅ NotificationService.deleteNotification - notification deleted');
    } catch (error) {
      console.error('❌ NotificationService.deleteNotification error:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for user
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      console.log('📊 NotificationService.getNotificationStats - userId:', userId);

      const [total, unread, byTypeData] = await Promise.all([
        prisma.notification.count({
          where: { userId },
        }),
        prisma.notification.count({
          where: { userId, read: false },
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true },
        }),
      ]);

      // NotificationType enum'ındaki tüm değerler için sayıları hazırla
      const byType: Record<NotificationType, number> = {
        ENROLLMENT_APPROVED: 0,
        ENROLLMENT_REJECTED: 0,
        COURSE_UPDATE: 0,
        QUIZ_RESULT: 0,
        SYSTEM_ANNOUNCEMENT: 0,
      };

      // Gerçek sayıları doldur
      byTypeData.forEach(item => {
        byType[item.type] = item._count.type;
      });

      const stats: NotificationStats = {
        total,
        unread,
        byType,
      };

      console.log('📊 NotificationService.getNotificationStats - stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ NotificationService.getNotificationStats error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      console.log('🔢 NotificationService.getUnreadCount - userId:', userId);

      const count = await prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      });

      console.log('📊 NotificationService.getUnreadCount - count:', count);
      return count;
    } catch (error) {
      console.error('❌ NotificationService.getUnreadCount error:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   */
  static async cleanupNotifications(options: NotificationCleanupOptions = {}): Promise<{ deletedCount: number }> {
    try {
      const { olderThanDays = 30, readOnly = true, type } = options;
      
      console.log('🧹 NotificationService.cleanupNotifications - options:', options);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const where: any = {
        createdAt: { lt: cutoffDate },
      };

      if (readOnly) {
        where.read = true;
      }

      if (type) {
        where.type = type;
      }

      const result = await prisma.notification.deleteMany({
        where,
      });

      console.log('✅ NotificationService.cleanupNotifications - deleted:', result.count);
      return { deletedCount: result.count };
    } catch (error) {
      console.error('❌ NotificationService.cleanupNotifications error:', error);
      throw error;
    }
  }

  /**
   * Create enrollment status notification
   */
  static async createEnrollmentNotification(
    userId: string,
    courseTitle: string,
    status: 'approved' | 'rejected',
    adminNote?: string
  ): Promise<NotificationData> {
    try {
      console.log('🎓 NotificationService.createEnrollmentNotification - userId:', userId, 'status:', status);

      const isApproved = status === 'approved';
      const type = isApproved ? NotificationType.ENROLLMENT_APPROVED : NotificationType.ENROLLMENT_REJECTED;
      
      const title = isApproved 
        ? 'Kayıt Talebiniz Onaylandı' 
        : 'Kayıt Talebiniz Reddedildi';
      
      let message = isApproved
        ? `"${courseTitle}" kursuna kayıt talebiniz onaylandı. Artık kursa erişebilirsiniz.`
        : `"${courseTitle}" kursuna kayıt talebiniz reddedildi.`;

      if (adminNote) {
        message += ` Admin notu: ${adminNote}`;
      }

      return this.createNotification({
        userId,
        title,
        message,
        type,
      });
    } catch (error) {
      console.error('❌ NotificationService.createEnrollmentNotification error:', error);
      throw error;
    }
  }

  /**
   * Create course update notification
   */
  static async createCourseUpdateNotification(
    userIds: string[],
    courseTitle: string,
    updateType: 'new_lesson' | 'new_quiz' | 'content_update'
  ): Promise<NotificationData[]> {
    try {
      console.log('📚 NotificationService.createCourseUpdateNotification - userIds count:', userIds.length, 'updateType:', updateType);

      let title: string;
      let message: string;

      switch (updateType) {
        case 'new_lesson':
          title = 'Yeni Ders Eklendi';
          message = `"${courseTitle}" kursuna yeni bir ders eklendi.`;
          break;
        case 'new_quiz':
          title = 'Yeni Quiz Eklendi';
          message = `"${courseTitle}" kursuna yeni bir quiz eklendi.`;
          break;
        case 'content_update':
          title = 'Kurs İçeriği Güncellendi';
          message = `"${courseTitle}" kursunun içeriği güncellendi.`;
          break;
        default:
          title = 'Kurs Güncellendi';
          message = `"${courseTitle}" kursunda değişiklikler yapıldı.`;
      }

      return this.createBulkNotifications({
        userIds,
        title,
        message,
        type: NotificationType.COURSE_UPDATE,
      });
    } catch (error) {
      console.error('❌ NotificationService.createCourseUpdateNotification error:', error);
      throw error;
    }
  }

  /**
   * Create quiz result notification
   */
  static async createQuizResultNotification(
    userId: string,
    quizTitle: string,
    score: number,
    maxScore: number
  ): Promise<NotificationData> {
    try {
      console.log('📝 NotificationService.createQuizResultNotification - userId:', userId, 'score:', score);

      const percentage = Math.round((score / maxScore) * 100);
      const title = 'Quiz Sonucunuz Hazır';
      const message = `"${quizTitle}" quiz'inde ${score}/${maxScore} puan aldınız (%${percentage}).`;

      return this.createNotification({
        userId,
        title,
        message,
        type: NotificationType.QUIZ_RESULT,
      });
    } catch (error) {
      console.error('❌ NotificationService.createQuizResultNotification error:', error);
      throw error;
    }
  }

  /**
   * Create system announcement notification
   */
  static async createSystemAnnouncement(
    userIds: string[],
    title: string,
    message: string
  ): Promise<NotificationData[]> {
    try {
      console.log('📢 NotificationService.createSystemAnnouncement - userIds count:', userIds.length);

      return this.createBulkNotifications({
        userIds,
        title,
        message,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
      });
    } catch (error) {
      console.error('❌ NotificationService.createSystemAnnouncement error:', error);
      throw error;
    }
  }
}