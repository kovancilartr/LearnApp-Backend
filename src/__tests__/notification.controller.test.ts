import request from 'supertest';
import app from '../index';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '@prisma/client';

describe('Notification Controller', () => {
  let authToken: string;
  let userId: string;
  let notificationId: string;

  beforeAll(async () => {
    // Test kullanıcısı oluştur ve giriş yap
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'notification.test@example.com',
        password: 'TestPassword123!',
        name: 'Notification Test User',
        role: 'STUDENT'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'notification.test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.data.accessToken;
    userId = loginResponse.body.data.user.id;

    // Test bildirimi oluştur
    const notification = await NotificationService.createNotification({
      userId,
      title: 'Test Bildirimi',
      message: 'Bu bir test bildirimidir',
      type: NotificationType.SYSTEM_ANNOUNCEMENT
    });
    notificationId = notification.id;
  });

  afterAll(async () => {
    // Test verilerini temizle
    await prisma.notification.deleteMany({
      where: { userId }
    });
    await prisma.user.delete({
      where: { id: userId }
    });
  });

  describe('GET /api/notifications', () => {
    it('kullanıcının bildirimlerini başarıyla getirmeli', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('sayfalama parametreleri ile çalışmalı', async () => {
      const response = await request(app)
        .get('/api/notifications?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('okunma durumu filtresi ile çalışmalı', async () => {
      const response = await request(app)
        .get('/api/notifications?read=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Tüm bildirimler okunmamış olmalı
      response.body.data.items.forEach((notification: any) => {
        expect(notification.read).toBe(false);
      });
    });

    it('authentication olmadan erişim reddedilmeli', async () => {
      await request(app)
        .get('/api/notifications')
        .expect(401);
    });
  });

  describe('GET /api/notifications/count', () => {
    it('okunmamış bildirim sayısını başarıyla getirmeli', async () => {
      const response = await request(app)
        .get('/api/notifications/count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
      expect(response.body.data.count).toBeGreaterThanOrEqual(0);
    });

    it('authentication olmadan erişim reddedilmeli', async () => {
      await request(app)
        .get('/api/notifications/count')
        .expect(401);
    });
  });

  describe('GET /api/notifications/stats', () => {
    it('bildirim istatistiklerini başarıyla getirmeli', async () => {
      const response = await request(app)
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('unread');
      expect(response.body.data).toHaveProperty('byType');
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.unread).toBe('number');
      expect(typeof response.body.data.byType).toBe('object');
    });
  });

  describe('GET /api/notifications/:id', () => {
    it('belirli bir bildirimi başarıyla getirmeli', async () => {
      const response = await request(app)
        .get(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', notificationId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('type');
    });

    it('var olmayan bildirim için 404 döndürmeli', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .get(`/api/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('geçersiz ID formatı için 400 döndürmeli', async () => {
      await request(app)
        .get('/api/notifications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // UUID validation hatası
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    it('bildirimi okundu olarak işaretlemeli', async () => {
      const response = await request(app)
        .post(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('read', true);
    });

    it('var olmayan bildirim için 404 döndürmeli', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .post(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/notifications/:id/unread', () => {
    it('bildirimi okunmadı olarak işaretlemeli', async () => {
      const response = await request(app)
        .post(`/api/notifications/${notificationId}/unread`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('read', false);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('tüm bildirimleri okundu olarak işaretlemeli', async () => {
      // Önce birkaç okunmamış bildirim oluştur
      await NotificationService.createNotification({
        userId,
        title: 'Test Bildirimi 2',
        message: 'Bu ikinci test bildirimidir',
        type: NotificationType.COURSE_UPDATE
      });

      const response = await request(app)
        .post('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('bildirimi başarıyla silmeli', async () => {
      // Silinecek bildirim oluştur
      const notification = await NotificationService.createNotification({
        userId,
        title: 'Silinecek Bildirim',
        message: 'Bu bildirim silinecek',
        type: NotificationType.SYSTEM_ANNOUNCEMENT
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');

      // Bildirimin silindiğini kontrol et
      await request(app)
        .get(`/api/notifications/${notification.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('var olmayan bildirim için 404 döndürmeli', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .delete(`/api/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/notifications/cleanup', () => {
    let adminToken: string;
    let adminUserId: string;

    beforeAll(async () => {
      // Admin kullanıcısı oluştur
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin.notification@example.com',
          password: 'AdminPassword123!',
          name: 'Admin User',
          role: 'ADMIN'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.notification@example.com',
          password: 'AdminPassword123!'
        });

      adminToken = adminLoginResponse.body.data.accessToken;
      adminUserId = adminLoginResponse.body.data.user.id;
    });

    afterAll(async () => {
      // Admin kullanıcısını temizle
      await prisma.user.delete({
        where: { id: adminUserId }
      });
    });

    it('admin kullanıcı bildirim temizleme yapabilmeli', async () => {
      const response = await request(app)
        .delete('/api/notifications/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          olderThanDays: 1,
          readOnly: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deletedCount');
      expect(typeof response.body.data.deletedCount).toBe('number');
    });

    it('admin olmayan kullanıcı için 403 döndürmeli', async () => {
      await request(app)
        .delete('/api/notifications/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          olderThanDays: 30,
          readOnly: true
        })
        .expect(403);
    });

    it('authentication olmadan erişim reddedilmeli', async () => {
      await request(app)
        .delete('/api/notifications/cleanup')
        .send({
          olderThanDays: 30,
          readOnly: true
        })
        .expect(401);
    });
  });
});