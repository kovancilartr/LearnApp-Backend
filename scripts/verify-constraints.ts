import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyConstraints() {
  console.log('🔍 Verifying database constraints and indexes...\n');

  try {
    // 1. Check unique constraints
    console.log('1. Checking unique constraints...');
    
    // Check email uniqueness
    const emailDuplicates = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `;
    console.log('Email duplicates found:', emailDuplicates);

    // Check filename uniqueness
    const filenameDuplicates = await prisma.$queryRaw`
      SELECT filename, COUNT(*) as count
      FROM files
      GROUP BY filename
      HAVING COUNT(*) > 1
    `;
    console.log('Filename duplicates found:', filenameDuplicates);

    // 2. Check foreign key constraints
    console.log('\n2. Checking foreign key integrity...');
    
    // Check orphaned students
    const orphanedStudents = await prisma.$queryRaw`
      SELECT s.id, s."userId"
      FROM students s
      LEFT JOIN users u ON s."userId" = u.id
      WHERE u.id IS NULL
    `;
    console.log('Orphaned students found:', orphanedStudents);

    // Check orphaned courses
    const orphanedCourses = await prisma.$queryRaw`
      SELECT c.id, c.title, c."teacherId"
      FROM courses c
      LEFT JOIN teachers t ON c."teacherId" = t.id
      WHERE c."teacherId" IS NOT NULL AND t.id IS NULL
    `;
    console.log('Orphaned courses found:', orphanedCourses);

    // 3. Check indexes exist
    console.log('\n3. Checking database indexes...');
    
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    
    console.log('Database indexes:');
    (indexes as any[]).forEach((index: any) => {
      console.log(`  ${index.tablename}.${index.indexname}`);
    });

    // 4. Test constraint violations
    console.log('\n4. Testing constraint violations...');
    
    // Test unique email constraint
    try {
      const existingUser = await prisma.user.findFirst();
      if (existingUser) {
        await prisma.user.create({
          data: {
            email: existingUser.email,
            name: 'Test Duplicate',
            password: 'test123',
            role: 'STUDENT',
          },
        });
        console.log('❌ Email unique constraint not working');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✅ Email unique constraint working');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test section order constraint
    try {
      const course = await prisma.course.findFirst();
      if (course) {
        const existingSection = await prisma.section.findFirst({
          where: { courseId: course.id }
        });
        
        if (existingSection) {
          await prisma.section.create({
            data: {
              title: 'Test Duplicate Order',
              courseId: course.id,
              order: existingSection.order,
            },
          });
          console.log('❌ Section order unique constraint not working');
        }
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✅ Section order unique constraint working');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // 5. Performance test with indexes
    console.log('\n5. Testing query performance with indexes...');
    
    const performanceTests = [
      {
        name: 'User by email (indexed)',
        query: () => prisma.user.findMany({
          where: { email: { contains: 'admin' } }
        })
      },
      {
        name: 'User by role (indexed)',
        query: () => prisma.user.findMany({
          where: { role: 'STUDENT' }
        })
      },
      {
        name: 'Courses by teacher (indexed)',
        query: () => prisma.course.findMany({
          where: { teacherId: { not: null } }
        })
      },
      {
        name: 'Enrollments by student (indexed)',
        query: () => prisma.enrollment.findMany({
          take: 10
        })
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      await test.query();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const status = duration < 50 ? '✅' : duration < 100 ? '⚠️' : '❌';
      console.log(`  ${status} ${test.name}: ${duration}ms`);
    }

    console.log('\n✅ Constraint verification completed!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConstraints();