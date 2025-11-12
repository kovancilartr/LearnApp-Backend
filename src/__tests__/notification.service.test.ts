import { NotificationService } from '../services/notification.service';
import { prisma } from '../config/database';

// Mock NotificationType enum
const NotificationType = {
  ENROLLMENT_APPROVED: 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED: 'ENROLLMENT_REJECTED',
  COURSE_UPDATE: 'COURSE_UPDATE',
  QUIZ_RESULT: 'QUIZ_RESULT',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
} as const;

// Mock Prisma
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const mockUser = { id: 'user-1' };
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.notification.create.mockResolvedValue(mockNotification as any);

      const result = await NotificationService.createNotification({
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Test Notification',
          message: 'Test message',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
        },
      });

      expect(result).toEqual(mockNotification);
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        NotificationService.createNotification({
          userId: 'non-existent-user',
          title: 'Test Notification',
          message: 'Test message',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('createEnrollmentNotification', () => {
    it('should create enrollment approved notification', async () => {
      const mockUser = { id: 'user-1' };
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        title: 'Kayıt Talebiniz Onaylandı',
        message: '"Test Course" kursuna kayıt talebiniz onaylandı. Artık kursa erişebilirsiniz.',
        type: NotificationType.ENROLLMENT_APPROVED,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.notification.create.mockResolvedValue(mockNotification as any);

      const result = await NotificationService.createEnrollmentNotification(
        'user-1',
        'Test Course',
        'approved'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Kayıt Talebiniz Onaylandı',
          message: '"Test Course" kursuna kayıt talebiniz onaylandı. Artık kursa erişebilirsiniz.',
          type: NotificationType.ENROLLMENT_APPROVED,
        },
      });

      expect(result).toEqual(mockNotification);
    });

    it('should create enrollment rejected notification with admin note', async () => {
      const mockUser = { id: 'user-1' };
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        title: 'Kayıt Talebiniz Reddedildi',
        message: '"Test Course" kursuna kayıt talebiniz reddedildi. Admin notu: Ön koşullar sağlanmamış.',
        type: NotificationType.ENROLLMENT_REJECTED,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.notification.create.mockResolvedValue(mockNotification as any);

      const result = await NotificationService.createEnrollmentNotification(
        'user-1',
        'Test Course',
        'rejected',
        'Ön koşullar sağlanmamış.'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Kayıt Talebiniz Reddedildi',
          message: '"Test Course" kursuna kayıt talebiniz reddedildi. Admin notu: Ön koşullar sağlanmamış.',
          type: NotificationType.ENROLLMENT_REJECTED,
        },
      });

      expect(result).toEqual(mockNotification);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await NotificationService.getUnreadCount('user-1');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });

      expect(result).toBe(5);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await NotificationService.markAllAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: {
          read: true,
        },
      });

      expect(result).toEqual({ count: 3 });
    });
  });

  describe('cleanupNotifications', () => {
    it('should cleanup old read notifications', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 10 });

      const result = await NotificationService.cleanupNotifications({
        olderThanDays: 30,
        readOnly: true,
      });

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 10 });
    });
  });
});