import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../types/auth.types';
import { z } from 'zod';

/**
 * Bildirim Controller'ı
 * Kullanıcı bildirimlerini yönetmek için API endpoint'leri
 */
export class NotificationController {
  /**
   * GET /api/notifications
   * Kullanıcının bildirimlerini sayfalama ile getir
   */
  static async getUserNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Query parametrelerini validate et
      const querySchema = z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
        read: z.string().optional().transform(val => {
          if (val === 'true') return true;
          if (val === 'false') return false;
          return undefined;
        }),
        type: z.enum(['ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'COURSE_UPDATE', 'QUIZ_RESULT', 'SYSTEM_ANNOUNCEMENT']).optional()
      });

      const query = querySchema.parse(req.query);

      // Limit'i maksimum 100 ile sınırla
      const limit = Math.min(query.limit, 100);

      const result = await NotificationService.getUserNotifications({
        userId,
        page: query.page,
        limit,
        read: query.read,
        type: query.type
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.getUserNotifications error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'NOTIFICATION_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Bildirimler getirilemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/notifications/count
   * Kullanıcının okunmamış bildirim sayısını getir
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const count = await NotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.getUnreadCount error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNREAD_COUNT_ERROR',
          message: 'Okunmamış bildirim sayısı getirilemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/notifications/stats
   * Kullanıcının bildirim istatistiklerini getir
   */
  static async getNotificationStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const stats = await NotificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.getNotificationStats error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_STATS_ERROR',
          message: 'Bildirim istatistikleri getirilemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/notifications/:id
   * Belirli bir bildirimi getir
   */
  static async getNotificationById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Bildirim ID\'si gerekli'
          },
          timestamp: new Date().toISOString()
        });
      }

      const notification = await NotificationService.getNotificationById(notificationId, userId);

      res.json({
        success: true,
        data: notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.getNotificationById error:', error);
      
      if (error instanceof Error && error.message === 'Notification not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Bildirim bulunamadı'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_FETCH_ERROR',
          message: 'Bildirim getirilemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/notifications/:id/read
   * Bildirimi okundu olarak işaretle
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Bildirim ID\'si gerekli'
          },
          timestamp: new Date().toISOString()
        });
      }

      const notification = await NotificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        data: notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.markAsRead error:', error);
      
      if (error instanceof Error && error.message === 'Notification not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Bildirim bulunamadı'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_READ_ERROR',
          message: 'Bildirim okundu olarak işaretlenemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/notifications/:id/unread
   * Bildirimi okunmadı olarak işaretle
   */
  static async markAsUnread(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Bildirim ID\'si gerekli'
          },
          timestamp: new Date().toISOString()
        });
      }

      const notification = await NotificationService.markAsUnread(notificationId, userId);

      res.json({
        success: true,
        data: notification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.markAsUnread error:', error);
      
      if (error instanceof Error && error.message === 'Notification not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Bildirim bulunamadı'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_UNREAD_ERROR',
          message: 'Bildirim okunmadı olarak işaretlenemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   * Tüm bildirimleri okundu olarak işaretle
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const result = await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.markAllAsRead error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_ALL_READ_ERROR',
          message: 'Tüm bildirimler okundu olarak işaretlenemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Bildirimi sil
   */
  static async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Bildirim ID\'si gerekli'
          },
          timestamp: new Date().toISOString()
        });
      }

      await NotificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        data: { message: 'Bildirim başarıyla silindi' },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.deleteNotification error:', error);
      
      if (error instanceof Error && error.message === 'Notification not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Bildirim bulunamadı'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_NOTIFICATION_ERROR',
          message: 'Bildirim silinemedi'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/notifications/cleanup
   * Eski bildirimleri temizle (sadece admin)
   */
  static async cleanupNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      // Sadece admin kullanıcılar bu işlemi yapabilir
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Bu işlem için yeterli yetkiniz yok'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Request body'yi validate et
      const bodySchema = z.object({
        olderThanDays: z.number().min(1).max(365).optional().default(30),
        readOnly: z.boolean().optional().default(true),
        type: z.enum(['ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'COURSE_UPDATE', 'QUIZ_RESULT', 'SYSTEM_ANNOUNCEMENT']).optional()
      });

      const options = bodySchema.parse(req.body);

      const result = await NotificationService.cleanupNotifications(options);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ NotificationController.cleanupNotifications error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Bildirim temizleme işlemi başarısız'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}