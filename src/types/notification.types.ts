import { NotificationType } from '@prisma/client';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface UpdateNotificationRequest {
  read?: boolean;
}

export interface NotificationQuery {
  userId: string;
  read?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface BulkNotificationRequest {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationCleanupOptions {
  olderThanDays?: number;
  readOnly?: boolean;
  type?: NotificationType;
}