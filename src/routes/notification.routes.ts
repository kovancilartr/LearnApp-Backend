import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

/**
 * Bildirim Route'ları
 * Tüm endpoint'ler authentication gerektirir
 */

// Tüm route'lar için authentication middleware'i uygula
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Kullanıcının bildirimlerini sayfalama ile getir
 * Query parametreleri:
 * - page: sayfa numarası (varsayılan: 1)
 * - limit: sayfa başına öğe sayısı (varsayılan: 20, maksimum: 100)
 * - read: okunma durumu (true/false)
 * - type: bildirim tipi (ENROLLMENT_APPROVED, ENROLLMENT_REJECTED, vb.)
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * GET /api/notifications/count
 * Kullanıcının okunmamış bildirim sayısını getir
 */
router.get('/count', NotificationController.getUnreadCount);

/**
 * GET /api/notifications/stats
 * Kullanıcının bildirim istatistiklerini getir
 */
router.get('/stats', NotificationController.getNotificationStats);

/**
 * PUT /api/notifications/read-all
 * Mark all user notifications as read
 */
router.put('/read-all', NotificationController.markAllAsRead);

/**
 * DELETE /api/notifications/cleanup
 * Clean up old notifications (admin only)
 * Body parameters:
 * - olderThanDays: how many days old notifications to delete (default: 30)
 * - readOnly: delete only read notifications (default: true)
 * - type: delete specific notification type (optional)
 */
router.delete('/cleanup', roleMiddleware(['ADMIN']), NotificationController.cleanupNotifications);

/**
 * GET /api/notifications/:id
 * Belirli bir bildirimi getir
 */
router.get('/:id', NotificationController.getNotificationById);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', NotificationController.markAsRead);

/**
 * PUT /api/notifications/:id/unread
 * Mark notification as unread
 */
router.put('/:id/unread', NotificationController.markAsUnread);

/**
 * DELETE /api/notifications/:id
 * Bildirimi sil
 */
router.delete('/:id', NotificationController.deleteNotification);

export default router;