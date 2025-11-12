import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConstraints() {
  console.log('🔍 Checking database constraints...\n');

  try {
    // Check for duplicate section orders within courses
    console.log('1. Checking section order duplicates...');
    const sectionDuplicates = await prisma.$queryRaw`
      SELECT "courseId", "order", COUNT(*) as count
      FROM "sections"
      GROUP BY "courseId", "order"
      HAVING COUNT(*) > 1
    `;
    console.log('Section duplicates:', sectionDuplicates);

    // Check for duplicate lesson orders within sections
    console.log('\n2. Checking lesson order duplicates...');
    const lessonDuplicates = await prisma.$queryRaw`
      SELECT "sectionId", "order", COUNT(*) as count
      FROM "lessons"
      GROUP BY "sectionId", "order"
      HAVING COUNT(*) > 1
    `;
    console.log('Lesson duplicates:', lessonDuplicates);

    // Check for duplicate question orders within quizzes
    console.log('\n3. Checking question order duplicates...');
    const questionDuplicates = await prisma.$queryRaw`
      SELECT "quizId", "order", COUNT(*) as count
      FROM "questions"
      GROUP BY "quizId", "order"
      HAVING COUNT(*) > 1
    `;
    console.log('Question duplicates:', questionDuplicates);

    // Check for duplicate choice labels within questions
    console.log('\n4. Checking choice label duplicates...');
    const choiceDuplicates = await prisma.$queryRaw`
      SELECT "questionId", "label", COUNT(*) as count
      FROM "choices"
      GROUP BY "questionId", "label"
      HAVING COUNT(*) > 1
    `;
    console.log('Choice duplicates:', choiceDuplicates);

    // Check for duplicate filenames
    console.log('\n5. Checking filename duplicates...');
    const filenameDuplicates = await prisma.$queryRaw`
      SELECT "filename", COUNT(*) as count
      FROM "files"
      GROUP BY "filename"
      HAVING COUNT(*) > 1
    `;
    console.log('Filename duplicates:', filenameDuplicates);

    // Check data length issues
    console.log('\n6. Checking data length issues...');
    
    // Check email lengths
    const longEmails = await prisma.$queryRaw`
      SELECT id, email, LENGTH(email) as length
      FROM "users"
      WHERE LENGTH(email) > 255
    `;
    console.log('Long emails:', longEmails);

    // Check name lengths
    const longNames = await prisma.$queryRaw`
      SELECT id, name, LENGTH(name) as length
      FROM "users"
      WHERE LENGTH(name) > 100
    `;
    console.log('Long names:', longNames);

    // Check title lengths
    const longCourseTitles = await prisma.$queryRaw`
      SELECT id, title, LENGTH(title) as length
      FROM "courses"
      WHERE LENGTH(title) > 200
    `;
    console.log('Long course titles:', longCourseTitles);

    console.log('\n✅ Constraint check completed!');

  } catch (error) {
    console.error('❌ Error checking constraints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();