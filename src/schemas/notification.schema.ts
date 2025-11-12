import { z } from 'zod';

/**
 * Bildirim Validation Schema'ları
 */

// Bildirim tipi enum'u
export const NotificationTypeSchema = z.enum([
  'ENROLLMENT_APPROVED',
  'ENROLLMENT_REJECTED', 
  'COURSE_UPDATE',
  'QUIZ_RESULT',
  'SYSTEM_ANNOUNCEMENT'
]);

// Bildirim oluşturma schema'sı
export const CreateNotificationSchema = z.object({
  userId: z.string().uuid('Geçerli bir kullanıcı ID\'si gerekli'),
  title: z.string()
    .min(1, 'Başlık gerekli')
    .max(200, 'Başlık maksimum 200 karakter olabilir'),
  message: z.string()
    .min(1, 'Mesaj gerekli')
    .max(1000, 'Mesaj maksimum 1000 karakter olabilir'),
  type: NotificationTypeSchema
});

// Toplu bildirim oluşturma schema'sı
export const BulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid('Geçerli kullanıcı ID\'si gerekli'))
    .min(1, 'En az bir kullanıcı ID\'si gerekli')
    .max(1000, 'Maksimum 1000 kullanıcıya bildirim gönderilebilir'),
  title: z.string()
    .min(1, 'Başlık gerekli')
    .max(200, 'Başlık maksimum 200 karakter olabilir'),
  message: z.string()
    .min(1, 'Mesaj gerekli')
    .max(1000, 'Mesaj maksimum 1000 karakter olabilir'),
  type: NotificationTypeSchema
});

// Bildirim güncelleme schema'sı
export const UpdateNotificationSchema = z.object({
  read: z.boolean().optional()
});

// Bildirim sorgulama schema'sı
export const NotificationQuerySchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  read: z.boolean().optional(),
  type: NotificationTypeSchema.optional()
});

// Bildirim temizleme schema'sı
export const NotificationCleanupSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).optional().default(30),
  readOnly: z.boolean().optional().default(true),
  type: NotificationTypeSchema.optional()
});

// Kayıt bildirimi schema'sı
export const EnrollmentNotificationSchema = z.object({
  userId: z.string().uuid('Geçerli bir kullanıcı ID\'si gerekli'),
  courseTitle: z.string().min(1, 'Kurs başlığı gerekli'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Durum approved veya rejected olmalı' })
  }),
  adminNote: z.string().max(500, 'Admin notu maksimum 500 karakter olabilir').optional()
});

// Kurs güncelleme bildirimi schema'sı
export const CourseUpdateNotificationSchema = z.object({
  userIds: z.array(z.string().uuid('Geçerli kullanıcı ID\'si gerekli'))
    .min(1, 'En az bir kullanıcı ID\'si gerekli'),
  courseTitle: z.string().min(1, 'Kurs başlığı gerekli'),
  updateType: z.enum(['new_lesson', 'new_quiz', 'content_update'], {
    errorMap: () => ({ message: 'Güncelleme tipi geçersiz' })
  })
});

// Quiz sonucu bildirimi schema'sı
export const QuizResultNotificationSchema = z.object({
  userId: z.string().uuid('Geçerli bir kullanıcı ID\'si gerekli'),
  quizTitle: z.string().min(1, 'Quiz başlığı gerekli'),
  score: z.number().min(0, 'Puan negatif olamaz'),
  maxScore: z.number().min(1, 'Maksimum puan en az 1 olmalı')
});

// Sistem duyurusu schema'sı
export const SystemAnnouncementSchema = z.object({
  userIds: z.array(z.string().uuid('Geçerli kullanıcı ID\'si gerekli'))
    .min(1, 'En az bir kullanıcı ID\'si gerekli'),
  title: z.string()
    .min(1, 'Başlık gerekli')
    .max(200, 'Başlık maksimum 200 karakter olabilir'),
  message: z.string()
    .min(1, 'Mesaj gerekli')
    .max(1000, 'Mesaj maksimum 1000 karakter olabilir')
});

// Type exports
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type BulkNotificationInput = z.infer<typeof BulkNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>;
export type NotificationCleanupInput = z.infer<typeof NotificationCleanupSchema>;
export type EnrollmentNotificationInput = z.infer<typeof EnrollmentNotificationSchema>;
export type CourseUpdateNotificationInput = z.infer<typeof CourseUpdateNotificationSchema>;
export type QuizResultNotificationInput = z.infer<typeof QuizResultNotificationSchema>;
export type SystemAnnouncementInput = z.infer<typeof SystemAnnouncementSchema>;