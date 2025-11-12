import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Veritabanı seed işlemi başlatılıyor...");

  // Mevcut verileri doğru sırada temizle (foreign key kısıtlamalarına uygun)
  await prisma.response.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.choice.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.completion.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Mevcut veriler temizlendi");

  // Tüm kullanıcılar için şifre hash'le
  const hashedPassword = await bcrypt.hash("sifre123", 10);

  // Admin Kullanıcısı Oluştur
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@egitimplatformu.com",
      name: "Sistem Yöneticisi",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("👤 Admin kullanıcısı oluşturuldu");

  // Öğretmen Kullanıcıları Oluştur
  const teacher1User = await prisma.user.create({
    data: {
      email: "ahmet.ogretmen@egitimplatformu.com",
      name: "Ahmet Yılmaz",
      password: hashedPassword,
      role: Role.TEACHER,
    },
  });

  const teacher2User = await prisma.user.create({
    data: {
      email: "ayse.ogretmen@egitimplatformu.com",
      name: "Ayşe Demir",
      password: hashedPassword,
      role: Role.TEACHER,
    },
  });

  // Öğretmen Profillerini Oluştur
  const teacher1 = await prisma.teacher.create({
    data: {
      userId: teacher1User.id,
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      userId: teacher2User.id,
    },
  });

  console.log("👨‍🏫 Öğretmen kullanıcıları ve profilleri oluşturuldu");

  // Veli Kullanıcısı Oluştur
  const parentUser = await prisma.user.create({
    data: {
      email: "veli@egitimplatformu.com",
      name: "Fatma Kaya",
      password: hashedPassword,
      role: Role.PARENT,
    },
  });

  const parent = await prisma.parent.create({
    data: {
      userId: parentUser.id,
    },
  });

  console.log("👩‍👧‍👦 Veli kullanıcısı ve profili oluşturuldu");

  // Öğrenci Kullanıcıları Oluştur
  const student1User = await prisma.user.create({
    data: {
      email: "elif.ogrenci@egitimplatformu.com",
      name: "Elif Kaya",
      password: hashedPassword,
      role: Role.STUDENT,
    },
  });

  const student2User = await prisma.user.create({
    data: {
      email: "mehmet.ogrenci@egitimplatformu.com",
      name: "Mehmet Kaya",
      password: hashedPassword,
      role: Role.STUDENT,
    },
  });

  const student3User = await prisma.user.create({
    data: {
      email: "zeynep.ogrenci@egitimplatformu.com",
      name: "Zeynep Özkan",
      password: hashedPassword,
      role: Role.STUDENT,
    },
  });

  // Öğrenci Profillerini Oluştur (Elif ve Mehmet, Fatma Kaya'nın çocukları)
  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      parentId: parent.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      parentId: parent.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: student3User.id,
      // Zeynep'in velisi bağlı değil
    },
  });

  console.log("👨‍🎓 Öğrenci kullanıcıları ve profilleri oluşturuldu");

  // Kursları Oluştur
  const mathCourse = await prisma.course.create({
    data: {
      title: "Matematik Temelleri",
      description:
        "Cebir, geometri ve temel kalkülüs dahil olmak üzere matematik temellerini öğrenin.",
      teacherId: teacher1.id,
    },
  });

  const scienceCourse = await prisma.course.create({
    data: {
      title: "Fen Bilimleri Temelleri",
      description:
        "Fizik, kimya ve biyoloji temelleri ile bilim dünyasını keşfedin.",
      teacherId: teacher2.id,
    },
  });

  const turkishCourse = await prisma.course.create({
    data: {
      title: "Türk Dili ve Edebiyatı",
      description:
        "Klasik ve modern edebiyat eserlerini incelerken okuma ve yazma becerilerinizi geliştirin.",
      teacherId: teacher1.id,
    },
  });

  console.log("📚 Kurslar oluşturuldu");

  // Matematik Kursu için Bölümler Oluştur
  const mathSection1 = await prisma.section.create({
    data: {
      title: "Cebir Temelleri",
      order: 1,
      courseId: mathCourse.id,
    },
  });

  const mathSection2 = await prisma.section.create({
    data: {
      title: "Geometri Temelleri",
      order: 2,
      courseId: mathCourse.id,
    },
  });

  // Fen Bilimleri Kursu için Bölümler Oluştur
  const scienceSection1 = await prisma.section.create({
    data: {
      title: "Fizik Giriş",
      order: 1,
      courseId: scienceCourse.id,
    },
  });

  const scienceSection2 = await prisma.section.create({
    data: {
      title: "Kimya Temelleri",
      order: 2,
      courseId: scienceCourse.id,
    },
  });

  // Türkçe Kursu için Bölümler Oluştur
  const turkishSection1 = await prisma.section.create({
    data: {
      title: "Klasik Edebiyat",
      order: 1,
      courseId: turkishCourse.id,
    },
  });

  console.log("📖 Kurs bölümleri oluşturuldu");

  // Matematik Kursu için Dersler Oluştur
  await prisma.lesson.create({
    data: {
      title: "Değişkenlere Giriş",
      content:
        "Bu derste değişkenleri ve cebirsel ifadelerde nasıl kullanıldıklarını öğreneceğiz.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 1,
      sectionId: mathSection1.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Doğrusal Denklem Çözme",
      content:
        "Pratik örneklerle doğrusal denklemleri adım adım nasıl çözeceğinizi öğrenin.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 2,
      sectionId: mathSection1.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Temel Geometrik Şekiller",
      content: "Farklı geometrik şekilleri ve özelliklerini keşfedin.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 1,
      sectionId: mathSection2.id,
    },
  });

  // Fen Bilimleri Kursu için Dersler Oluştur
  await prisma.lesson.create({
    data: {
      title: "Newton'un Hareket Yasaları",
      content: "Fizikte hareketi yöneten üç temel yasayı anlayın.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 1,
      sectionId: scienceSection1.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Atom Yapısı",
      content:
        "Atomlar, elektronlar, protonlar ve nötronlar hakkında bilgi edinin.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 1,
      sectionId: scienceSection2.id,
    },
  });

  // Türkçe Kursu için Dersler Oluştur
  await prisma.lesson.create({
    data: {
      title: "Yunus Emre'nin Şiirleri",
      content:
        "Türk edebiyatının büyük şairlerinden Yunus Emre'nin eserlerine giriş.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 1,
      sectionId: turkishSection1.id,
    },
  });

  console.log("📝 Dersler oluşturuldu");

  // Create Student Enrollments
  await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseId: mathCourse.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseId: scienceCourse.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      courseId: mathCourse.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      courseId: turkishCourse.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student3.id,
      courseId: scienceCourse.id,
    },
  });

  console.log("📋 Öğrenci kayıtları oluşturuldu");

  // Matematik Kursu için Örnek Sınav Oluştur
  const mathQuiz = await prisma.quiz.create({
    data: {
      title: "Cebir Temelleri Sınavı",
      courseId: mathCourse.id,
      duration: 1800, // 30 dakika saniye cinsinden
      attemptsAllowed: 2,
    },
  });

  // Matematik Sınavı için Sorular Oluştur
  const question1 = await prisma.question.create({
    data: {
      quizId: mathQuiz.id,
      text: "2x + 5 = 15 denkleminde x'in değeri nedir?",
      order: 1,
    },
  });

  const question2 = await prisma.question.create({
    data: {
      quizId: mathQuiz.id,
      text: "Aşağıdakilerden hangisi doğrusal bir denklemdir?",
      order: 2,
    },
  });

  // Soru 1 için Seçenekler Oluştur
  await prisma.choice.create({
    data: {
      questionId: question1.id,
      label: "A",
      text: "x = 5",
      correct: true,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question1.id,
      label: "B",
      text: "x = 10",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question1.id,
      label: "C",
      text: "x = 7.5",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question1.id,
      label: "D",
      text: "x = 2.5",
      correct: false,
    },
  });

  // Soru 2 için Seçenekler Oluştur
  await prisma.choice.create({
    data: {
      questionId: question2.id,
      label: "A",
      text: "y = x²",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question2.id,
      label: "B",
      text: "y = 2x + 3",
      correct: true,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question2.id,
      label: "C",
      text: "y = x³ - 1",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: question2.id,
      label: "D",
      text: "y = √x",
      correct: false,
    },
  });

  console.log("❓ Sorular ve seçeneklerle sınav oluşturuldu");

  // Fen Bilimleri Kursu için Örnek Sınav Oluştur
  const scienceQuiz = await prisma.quiz.create({
    data: {
      title: "Fizik Temelleri Sınavı",
      courseId: scienceCourse.id,
      duration: 1200, // 20 dakika saniye cinsinden
      attemptsAllowed: 1,
    },
  });

  const scienceQuestion = await prisma.question.create({
    data: {
      quizId: scienceQuiz.id,
      text: "Newton'un birinci yasasına göre, durgun haldeki bir cisim:",
      order: 1,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: scienceQuestion.id,
      label: "A",
      text: "Her zaman hareket etmeye başlar",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: scienceQuestion.id,
      label: "B",
      text: "Bir kuvvet uygulanmadıkça durgun kalır",
      correct: true,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: scienceQuestion.id,
      label: "C",
      text: "Dairesel hareket yapar",
      correct: false,
    },
  });

  await prisma.choice.create({
    data: {
      questionId: scienceQuestion.id,
      label: "D",
      text: "Sürekli hızlanır",
      correct: false,
    },
  });

  console.log("🔬 Fen bilimleri sınavı oluşturuldu");

  console.log("✅ Veritabanı seed işlemi başarıyla tamamlandı!");
  console.log("\n📊 Oluşturulan veri özeti:");
  console.log("- 1 Admin kullanıcısı (admin@egitimplatformu.com)");
  console.log(
    "- 2 Öğretmen kullanıcısı (ahmet.ogretmen@egitimplatformu.com, ayse.ogretmen@egitimplatformu.com)"
  );
  console.log("- 1 Veli kullanıcısı (veli@egitimplatformu.com)");
  console.log(
    "- 3 Öğrenci kullanıcısı (elif.ogrenci@egitimplatformu.com, mehmet.ogrenci@egitimplatformu.com, zeynep.ogrenci@egitimplatformu.com)"
  );
  console.log("- 3 Kurs (Matematik, Fen Bilimleri, Türkçe)");
  console.log("- 5 Bölüm tüm kurslar boyunca");
  console.log("- 6 Video içerikli ders");
  console.log("- 5 Öğrenci kaydı");
  console.log("- 2 Çoktan seçmeli sorulu sınav");
  console.log("\n🔑 Tüm kullanıcıların şifresi: sifre123");
}

main()
  .catch((e) => {
    console.error("❌ Seed işlemi sırasında hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
