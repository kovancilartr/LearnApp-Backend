import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConstraints() {
  console.log('🧪 Testing database constraints...\n');

  try {
    // Test 1: Unique constraint on email
    console.log('1. Testing unique email constraint...');
    try {
      await prisma.user.create({
        data: {
          email: 'admin@learnapp.com', // Bu email zaten var
          name: 'Test User',
          password: 'hashedpassword',
          role: 'STUDENT',
        },
      });
      console.log('❌ Unique email constraint failed - duplicate email was allowed');
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✅ Unique email constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 2: Foreign key constraint
    console.log('\n2. Testing foreign key constraint...');
    try {
      await prisma.student.create({
        data: {
          userId: '00000000-0000-0000-0000-000000000000', // Non-existent user ID
        },
      });
      console.log('❌ Foreign key constraint failed - invalid user ID was allowed');
    } catch (error: any) {
      if (error.code === 'P2003') {
        console.log('✅ Foreign key constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 3: Unique constraint on section order within course
    console.log('\n3. Testing section order unique constraint...');
    try {
      // Önce bir course bulalım
      const course = await prisma.course.findFirst();
      if (course) {
        // Aynı course'da aynı order'da iki section oluşturmaya çalışalım
        await prisma.section.create({
          data: {
            title: 'Test Section 1',
            courseId: course.id,
            order: 1,
          },
        });
        
        await prisma.section.create({
          data: {
            title: 'Test Section 2',
            courseId: course.id,
            order: 1, // Aynı order
          },
        });
        console.log('❌ Section order unique constraint failed - duplicate order was allowed');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✅ Section order unique constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Choice label unique constraint within question
    console.log('\n4. Testing choice label unique constraint...');
    try {
      // Önce bir quiz ve question bulalım
      const question = await prisma.question.findFirst();
      if (question) {
        // Aynı question'da aynı label'da iki choice oluşturmaya çalışalım
        await prisma.choice.create({
          data: {
            questionId: question.id,
            label: 'A',
            text: 'Test Choice 1',
            correct: false,
          },
        });
        
        await prisma.choice.create({
          data: {
            questionId: question.id,
            label: 'A', // Aynı label
            text: 'Test Choice 2',
            correct: false,
          },
        });
        console.log('❌ Choice label unique constraint failed - duplicate label was allowed');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✅ Choice label unique constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 5: Data length constraints
    console.log('\n5. Testing data length constraints...');
    try {
      await prisma.user.create({
        data: {
          email: 'a'.repeat(256) + '@test.com', // 256+ karakter email
          name: 'Test User',
          password: 'hashedpassword',
          role: 'STUDENT',
        },
      });
      console.log('❌ Email length constraint failed - long email was allowed');
    } catch (error: any) {
      if (error.message.includes('value too long')) {
        console.log('✅ Email length constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 6: Index performance test
    console.log('\n6. Testing index performance...');
    const startTime = Date.now();
    
    // Email ile arama (indexed)
    await prisma.user.findMany({
      where: {
        email: {
          contains: 'admin',
        },
      },
    });
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (queryTime < 100) {
      console.log(`✅ Index performance good: ${queryTime}ms`);
    } else {
      console.log(`⚠️ Index performance could be better: ${queryTime}ms`);
    }

    console.log('\n✅ Constraint testing completed!');

  } catch (error) {
    console.error('❌ Error during constraint testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConstraints();