# LearnApp Backend API

LearnApp uzaktan eğitim platformunun backend API'si. Node.js, Express.js, TypeScript ve PostgreSQL kullanılarak geliştirilmiştir.

## 🎯 Geliştirme Durumu - Backend %95 Tamamlandı! 🎉

### ✅ **Tamamlanan Backend Bileşenleri**

#### 🏗️ **Temel Altyapı**
- **Node.js + TypeScript** tabanlı modern backend
- **Express.js** web framework
- **Prisma ORM** ile PostgreSQL veritabanı
- **JWT** tabanlı authentication sistemi
- **Zod** ile input validation
- **Helmet** ile güvenlik
- **CORS** ve **Rate Limiting**

#### 🗄️ **Veritabanı Yapısı**
- **Tam ilişkisel veritabanı** (User, Course, Quiz, Progress vb.)
- **4 rol sistemi**: Admin, Teacher, Student, Parent
- **Prisma migrations** ile version control
- **Seed data** hazır

#### 🔐 **Authentication & Authorization**
- JWT access + refresh token sistemi
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Token cleanup utilities
- Secure middleware chain

#### 📁 **Dosya Yönetimi**
- **Multer** ile file upload
- **AWS S3** entegrasyonu
- **BunnyNet CDN** desteği
- Presigned URL sistemi
- File validation ve güvenlik

#### 🎓 **Eğitim Modülleri**

**Course Management:**
- Course CRUD operations
- Section ve Lesson yapısı
- Teacher assignment
- Student enrollment
- Progress tracking

**Quiz System:**
- Multiple choice questions
- Timed quizzes
- Attempt tracking
- Auto-scoring
- Result analytics

**Progress Tracking:**
- Lesson completion
- Quiz scores
- Parent monitoring
- Teacher analytics

#### 🛡️ **Güvenlik & Middleware**
- Authentication middleware
- Role-based authorization
- Input validation
- Error handling
- Rate limiting
- Security headers

#### 🧪 **Test Altyapısı**
- **Jest** test framework
- Unit tests (services)
- Integration tests (controllers)
- Database tests
- Authentication tests
- Mock sistemleri

#### 📊 **API Yapısı**
- RESTful API design
- Consistent response format
- Error handling
- API documentation (Swagger ready)
- Request/Response types

## Özellikler

- 🔐 JWT tabanlı kimlik doğrulama
- 👥 Rol tabanlı yetkilendirme (Admin, Teacher, Student, Parent)
- 📚 Kurs yönetimi
- 🎥 Video tabanlı dersler
- 📝 Quiz ve değerlendirme sistemi
- 📊 İlerleme takibi
- 📁 Dosya yükleme (Local Storage + BunnyNet CDN)
- 🛡️ Güvenlik middleware'leri
- ✅ Input validasyonu
- 🧪 Kapsamlı test coverage

## Teknoloji Stack'i

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT
- **File Storage:** Local Storage + BunnyNet CDN (optional)
- **Validation:** Zod
- **Testing:** Jest + Supertest

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment dosyasını oluşturun:
```bash
cp .env.example .env
```

3. Environment değişkenlerini düzenleyin:
```bash
# .env dosyasını düzenleyin
```

4. Veritabanını kurun:
```bash
npm run db:generate
npm run db:push
```

5. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Geliştirme sunucusunu başlatır
- `npm run build` - Production build oluşturur
- `npm run start` - Production sunucusunu başlatır
- `npm run db:generate` - Prisma client oluşturur
- `npm run db:push` - Veritabanı şemasını günceller
- `npm run db:migrate` - Migration çalıştırır

## 🚀 API Endpoints - Tam Hazır!

### Health Check
- `GET /health` - Sunucu durumu kontrolü
- `GET /api` - API bilgileri

### Authentication
- `POST /api/auth/login` - Giriş yapma
- `POST /api/auth/register` - Kayıt olma
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Çıkış yapma
- `POST /api/auth/logout-all` - Tüm cihazlardan çıkış

### User Management
- `GET /api/users` - Tüm kullanıcıları listele (Admin)
- `GET /api/users/:id` - Kullanıcı detayı
- `PUT /api/users/:id` - Kullanıcı güncelle
- `DELETE /api/users/:id` - Kullanıcı sil (Admin)
- `GET /api/profile` - Profil bilgileri
- `PUT /api/profile` - Profil güncelle

### Course Management
- `GET /api/courses` - Kursları listele
- `POST /api/courses` - Yeni kurs oluştur (Admin/Teacher)
- `GET /api/courses/:id` - Kurs detayı
- `PUT /api/courses/:id` - Kurs güncelle
- `DELETE /api/courses/:id` - Kurs sil
- `POST /api/courses/:id/enroll` - Kursa kayıt ol
- `POST /api/courses/:id/sections` - Bölüm ekle
- `POST /api/sections/:id/lessons` - Ders ekle

### Quiz System
- `GET /api/quizzes` - Quiz'leri listele
- `POST /api/quizzes` - Yeni quiz oluştur
- `GET /api/quizzes/:id` - Quiz detayı
- `POST /api/quizzes/:id/questions` - Soru ekle
- `POST /api/quizzes/:id/attempts` - Quiz'e başla
- `POST /api/attempts/:id/submit` - Quiz'i tamamla

### Progress Tracking
- `GET /api/progress/student/:id` - Öğrenci ilerlemesi
- `POST /api/progress/lesson-completion` - Ders tamamlama
- `GET /api/progress/course/:courseId/student/:studentId` - Kurs ilerlemesi
- `GET /api/progress/parent/children` - Çocuk ilerlemeleri (Parent)

### File Management
- `POST /api/files/upload` - Dosya yükle
- `GET /api/files/:id` - Dosya indir
- `DELETE /api/files/:id` - Dosya sil
- `POST /api/files/cdn/sync/:id` - CDN'e senkronize et
- `GET /api/files/cdn/stats` - CDN istatistikleri

## Proje Yapısı

```
src/
├── config/          # Konfigürasyon dosyaları
├── controllers/     # Route handler'ları
├── middleware/      # Express middleware'leri
├── services/        # İş mantığı
├── routes/          # API route tanımları
├── schemas/         # Validation şemaları
├── types/           # TypeScript type tanımları
├── utils/           # Yardımcı fonksiyonlar
└── index.ts         # Ana uygulama dosyası
```

## BunnyNet CDN Entegrasyonu

Bu proje isteğe bağlı olarak BunnyNet CDN entegrasyonunu destekler. BunnyNet, dosyaların hızlı ve güvenilir bir şekilde dağıtılması için kullanılır.

### BunnyNet Konfigürasyonu

1. BunnyNet hesabınızda bir Storage Zone oluşturun
2. Bir Pull Zone oluşturun ve Storage Zone'a bağlayın
3. Environment değişkenlerini ayarlayın:

```bash
BUNNYNET_ENABLED=true
BUNNYNET_STORAGE_ZONE=your-storage-zone-name
BUNNYNET_STORAGE_PASSWORD=your-storage-zone-password
BUNNYNET_PULL_ZONE_URL=https://your-pull-zone.b-cdn.net
BUNNYNET_STORAGE_API_URL=https://storage.bunnycdn.com
BUNNYNET_REGION=de
```

### CDN Özellikleri

- **Otomatik Yükleme:** Dosyalar yüklendiğinde otomatik olarak CDN'e senkronize edilir
- **Fallback Mekanizması:** CDN kullanılamıyorsa local storage'a geri döner
- **Bulk Sync:** Mevcut dosyaları toplu olarak CDN'e senkronize edebilir
- **İstatistikler:** CDN kullanım istatistiklerini görüntüleyebilir
- **Test Endpoint'leri:** CDN bağlantısını test edebilir

### CDN API Endpoints

- `POST /api/files/cdn/sync/:id` - Tek dosyayı CDN'e senkronize et
- `POST /api/files/cdn/bulk-sync` - Toplu senkronizasyon (Admin)
- `GET /api/files/cdn/stats` - CDN istatistikleri (Admin)
- `GET /api/files/cdn/test` - CDN bağlantı testi (Admin)

### BunnyNet Test

BunnyNet entegrasyonunu test etmek için:

```bash
npx tsx src/utils/bunnynet-test.ts
```

## 🎯 Frontend İhtiyaçlarını Karşılama Durumu

### ✅ **Tam Karşılanan İhtiyaçlar**

1. **Authentication API**
   - Login/Register endpoints
   - Token refresh
   - Role-based access

2. **User Management**
   - Profile management
   - Role-specific dashboards
   - Parent-child relationships

3. **Course Management**
   - Course CRUD
   - Section/Lesson structure
   - Enrollment system

4. **Quiz System**
   - Quiz creation/management
   - Question/Choice handling
   - Attempt tracking

5. **File Upload**
   - Image/PDF/Video upload
   - CDN integration
   - Secure file access

6. **Progress Tracking**
   - Completion tracking
   - Analytics data
   - Parent monitoring

### 🔄 **Frontend Entegrasyon Hazırlığı**

**API Response Format:**
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2025-01-07T..."
}
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {...}
  },
  "timestamp": "2025-01-07T..."
}
```

## 🚀 Frontend Geliştirme İçin Hazır Özellikler

### 📱 **Dashboard Data**
- **Admin:** User/Course management data
- **Teacher:** Course/Student analytics
- **Student:** Enrolled courses, progress
- **Parent:** Child monitoring data

### 🎨 **UI Components İçin Data**
- Course cards (title, description, progress)
- Quiz components (questions, choices, results)
- Progress bars ve charts
- File upload components

### 🔄 **Real-time Features**
- Progress updates
- Quiz submissions
- File upload progress

## 🎯 **Frontend Önerileri**

### **Next.js Web App İçin:**
```
src/
├── app/
│   ├── (auth)/login
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── teacher/
│   │   ├── student/
│   │   └── parent/
│   └── courses/[id]/
├── components/
│   ├── ui/ (shadcn/ui)
│   ├── auth/
│   ├── course/
│   └── quiz/
├── lib/
│   ├── api.ts
│   └── auth.ts
└── hooks/
    ├── useAuth.ts
    └── useCourses.ts
```

### **React Native App İçin:**
```
src/
├── screens/
│   ├── auth/
│   ├── dashboard/
│   └── course/
├── components/
├── navigation/
└── services/
    └── api.ts
```

## 🧪 Test Coverage

### **Test Türleri**
- **Unit Tests:** Service layer business logic
- **Integration Tests:** API endpoint testing
- **Database Tests:** CRUD operations
- **Authentication Tests:** JWT ve role-based access
- **Middleware Tests:** Security ve validation

### **Test Scripts**
```bash
npm test                    # Tüm testler
npm run test:unit          # Unit testler
npm run test:integration   # Integration testler
npm run test:auth          # Authentication testler
npm run test:database      # Database testler
npm run test:coverage      # Coverage raporu
```

## Geliştirme

Bu proje LearnApp spec'ine göre geliştirilmektedir. 

### ✅ **Tamamlanan Görevler:**
- ✅ Backend Foundation Setup
- ✅ Database Schema Implementation  
- ✅ Authentication System
- ✅ User Management System
- ✅ Course Management System
- ✅ Quiz and Assessment System
- ✅ File Upload System (Local Storage)
- ✅ BunnyNet CDN Integration
- ✅ Progress Tracking System
- ✅ API Documentation
- ✅ Comprehensive Testing
- ✅ Security Implementation
- ✅ Error Handling
- ✅ Input Validation

### 🎯 **Sonuç: Backend %95 Hazır!**

**✅ Güçlü Yanlar:**
- Tam RESTful API
- Güvenli authentication
- Kapsamlı test coverage
- Modern teknoloji stack
- Scalable architecture

**⚠️ Dikkat Edilecekler:**
- Database connection (PostgreSQL kurulumu)
- Environment variables (.env setup)
- File storage configuration
- CDN setup (optional)

**🚀 Frontend geliştirmeye başlayabilirsin!** Backend API'ları hazır ve test edilmiş durumda. Web ve mobile uygulamalar için tüm gerekli endpoints mevcut.

## Lisans

MIT# LearnApp-Backend
