const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

// Test credentials
const testCredentials = {
  admin: {
    email: 'admin@learnapp.com',
    password: 'admin123'
  },
  teacher: {
    email: 'teacher@learnapp.com',
    password: 'teacher123'
  },
  student: {
    email: 'student@learnapp.com',
    password: 'student123'
  }
};

let authTokens = {};

// Login function
async function login(role) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, testCredentials[role]);
    if (response.data.success) {
      authTokens[role] = response.data.data.accessToken;
      console.log(`✅ ${role} login successful`);
      return response.data.data.accessToken;
    }
  } catch (error) {
    console.error(`❌ ${role} login failed:`, error.response?.data || error.message);
    return null;
  }
}

// Create a test file
function createTestFile(filename, content = 'Test file content') {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// Test file upload
async function testFileUpload(role, filename, mimeType = 'text/plain') {
  try {
    const token = authTokens[role];
    if (!token) {
      console.error(`❌ No token for ${role}`);
      return;
    }

    const testFilePath = createTestFile(filename);
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), {
      filename: filename,
      contentType: mimeType
    });

    const response = await axios.post(`${BASE_URL}/api/files/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log(`✅ ${role} file upload successful:`, response.data.data.filename);
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
      
      return response.data.data;
    }
  } catch (error) {
    console.error(`❌ ${role} file upload failed:`, error.response?.data || error.message);
    
    // Clean up test file on error
    const testFilePath = path.join(__dirname, filename);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Test file download
async function testFileDownload(role, category, filename) {
  try {
    const token = authTokens[role];
    if (!token) {
      console.error(`❌ No token for ${role}`);
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/files/${category}/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 200) {
      console.log(`✅ ${role} file download successful`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${role} file download failed:`, error.response?.data || error.message);
    return false;
  }
}

// Test file stats
async function testFileStats(role) {
  try {
    const token = authTokens[role];
    if (!token) {
      console.error(`❌ No token for ${role}`);
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/files/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log(`✅ ${role} file stats:`, response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error(`❌ ${role} file stats failed:`, error.response?.data || error.message);
  }
}

// Test storage usage (admin only)
async function testStorageUsage() {
  try {
    const token = authTokens.admin;
    if (!token) {
      console.error('❌ No admin token');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/files/storage-usage`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ Storage usage:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ Storage usage failed:', error.response?.data || error.message);
  }
}

// Test cleanup functions (admin only)
async function testCleanup() {
  try {
    const token = authTokens.admin;
    if (!token) {
      console.error('❌ No admin token');
      return;
    }

    // Test orphaned files cleanup
    const orphanedResponse = await axios.post(`${BASE_URL}/api/files/cleanup/orphaned`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (orphanedResponse.data.success) {
      console.log('✅ Orphaned files cleanup:', orphanedResponse.data.data);
    }

    // Test temp files cleanup
    const tempResponse = await axios.post(`${BASE_URL}/api/files/cleanup/temp`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (tempResponse.data.success) {
      console.log('✅ Temp files cleanup:', tempResponse.data.data);
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
  }
}

// Test rate limiting
async function testRateLimit(role) {
  console.log(`\n🔄 Testing rate limiting for ${role}...`);
  
  const token = authTokens[role];
  if (!token) {
    console.error(`❌ No token for ${role}`);
    return;
  }

  // Try to upload many files quickly
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(testFileUpload(role, `rate-test-${i}.txt`));
  }

  try {
    await Promise.all(promises);
    console.log('⚠️  Rate limiting might not be working - all uploads succeeded');
  } catch (error) {
    console.log('✅ Rate limiting is working - some uploads were blocked');
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Enhanced File Upload Tests...\n');

  // Login all users
  console.log('📝 Logging in users...');
  await login('admin');
  await login('teacher');
  await login('student');

  console.log('\n📤 Testing file uploads...');
  
  // Test valid file uploads
  const adminFile = await testFileUpload('admin', 'admin-test.pdf', 'application/pdf');
  const teacherFile = await testFileUpload('teacher', 'teacher-test.jpg', 'image/jpeg');
  const studentFile = await testFileUpload('student', 'student-test.png', 'image/png');

  console.log('\n📥 Testing file downloads...');
  
  if (adminFile) {
    await testFileDownload('admin', 'pdfs', adminFile.filename);
  }
  if (teacherFile) {
    await testFileDownload('teacher', 'images', teacherFile.filename);
  }
  if (studentFile) {
    await testFileDownload('student', 'images', studentFile.filename);
  }

  console.log('\n📊 Testing file statistics...');
  await testFileStats('admin');
  await testFileStats('teacher');
  await testFileStats('student');

  console.log('\n💾 Testing storage usage (admin only)...');
  await testStorageUsage();

  console.log('\n🧹 Testing cleanup functions (admin only)...');
  await testCleanup();

  console.log('\n⚡ Testing rate limiting...');
  await testRateLimit('student');

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);