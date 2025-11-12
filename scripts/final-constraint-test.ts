import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../src/utils/validation.utils';

const prisma = new PrismaClient();

async function finalConstraintTest() {
  console.log('🧪 Final Database Constraint Test\n');

  try {
    // Test 1: Email uniqueness validation
    console.log('1. Testing email uniqueness validation...');
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      const isUnique = await ValidationUtils.isEmailUnique(existingUser.email);
      console.log(`   Email "${existingUser.email}" uniqueness: ${isUnique ? '❌ Should be false' : '✅ Correctly false'}`);
      
      const isUniqueWithExclusion = await ValidationUtils.isEmailUnique(existingUser.email, existingUser.id);
      console.log(`   Email with exclusion: ${isUniqueWithExclusion ? '✅ Correctly true' : '❌ Should be true'}`);
    }

    // Test 2: Foreign key validation
    console.log('\n2. Testing foreign key validation...');
    const validUserId = await prisma.user.findFirst().then(u => u?.id);
    const invalidUserId = '00000000-0000-0000-0000-000000000000';
    
    if (validUserId) {
      const validFK = await ValidationUtils.validateForeignKey('user', validUserId);
      console.log(`   Valid user ID: ${validFK ? '✅ Correctly true' : '❌ Should be true'}`);
    }
    
    const invalidFK = await ValidationUtils.validateForeignKey('user', invalidUserId);
    console.log(`   Invalid user ID: ${invalidFK ? '❌ Should be false' : '✅ Correctly false'}`);

    // Test 3: Section order uniqueness
    console.log('\n3. Testing section order uniqueness...');
    const course = await prisma.course.findFirst();
    if (course) {
      const existingSection = await prisma.section.findFirst({ where: { courseId: course.id } });
      if (existingSection) {
        const isOrderUnique = await ValidationUtils.isSectionOrderUnique(course.id, existingSection.order);
        console.log(`   Existing order ${existingSection.order}: ${isOrderUnique ? '❌ Should be false' : '✅ Correctly false'}`);
        
        const isOrderUniqueWithExclusion = await ValidationUtils.isSectionOrderUnique(course.id, existingSection.order, existingSection.id);
        console.log(`   Order with exclusion: ${isOrderUniqueWithExclusion ? '✅ Correctly true' : '❌ Should be true'}`);
      }
    }

    // Test 4: Data validation
    console.log('\n4. Testing data validation...');
    
    // Email validation
    const emailTests = [
      'valid@example.com',
      'invalid-email',
      'test@'.repeat(50) + 'toolong.com',
      'test..double@example.com',
      '.leading@example.com'
    ];
    
    for (const email of emailTests) {
      const validation = ValidationUtils.validateEmail(email);
      console.log(`   Email "${email.substring(0, 30)}...": ${validation.isValid ? '✅' : '❌'} ${validation.errors.join(', ')}`);
    }

    // Name validation
    const nameTests = [
      'Ahmet Yılmaz',
      'Ayşe Öztürk-Çelik',
      'A',
      'X'.repeat(101),
      'Invalid123Name',
      'Mehmet  Double  Space'
    ];
    
    for (const name of nameTests) {
      const validation = ValidationUtils.validateTurkishName(name);
      console.log(`   Name "${name.substring(0, 20)}...": ${validation.isValid ? '✅' : '❌'} ${validation.errors.join(', ')}`);
    }

    // Test 5: URL validation
    console.log('\n5. Testing URL validation...');
    const urlTests = [
      'https://www.youtube.com/watch?v=123',
      'http://example.com/file.pdf',
      'ftp://unsafe.com/file',
      'https://example.com/' + 'x'.repeat(500),
      'https://example.com/<script>alert(1)</script>'
    ];
    
    for (const url of urlTests) {
      const isValid = ValidationUtils.validateUrl(url);
      console.log(`   URL "${url.substring(0, 40)}...": ${isValid ? '✅' : '❌'}`);
    }

    // Test 6: Text sanitization
    console.log('\n6. Testing text sanitization...');
    const textTests = [
      'Normal text',
      '<script>alert("xss")</script>',
      '  Whitespace text  ',
      'Very long text that exceeds the maximum length limit and should be truncated',
      'Text with\0null bytes'
    ];
    
    for (const text of textTests) {
      const sanitized = ValidationUtils.sanitizeText(text, { maxLength: 50 });
      console.log(`   Original: "${text.substring(0, 30)}..."`);
      console.log(`   Sanitized: "${sanitized}"`);
    }

    console.log('\n✅ Final constraint test completed successfully!');

  } catch (error) {
    console.error('❌ Error during final constraint test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalConstraintTest();