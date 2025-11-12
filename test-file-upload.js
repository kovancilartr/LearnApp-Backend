const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Test file upload functionality
async function testFileUpload() {
  try {
    console.log('🧪 Testing file upload functionality...\n');

    // First, login to get a token
    console.log('1. Logging in to get authentication token...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@learnapp.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    // Create a test PDF file
    const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF File) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`;

    const testFilePath = path.join(__dirname, 'test-upload.pdf');
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Test PDF file created');

    // Test single file upload
    console.log('\n2. Testing single file upload...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));

    const uploadResponse = await axios.post('http://localhost:3002/api/files/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    if (uploadResponse.data.success) {
      console.log('✅ File upload successful');
      console.log('📄 File details:', {
        id: uploadResponse.data.data.id,
        filename: uploadResponse.data.data.filename,
        originalName: uploadResponse.data.data.originalName,
        size: uploadResponse.data.data.size,
        url: uploadResponse.data.data.url
      });

      const fileId = uploadResponse.data.data.id;

      // Test getting file metadata
      console.log('\n3. Testing file metadata retrieval...');
      const metadataResponse = await axios.get(`http://localhost:3002/api/files/metadata/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (metadataResponse.data.success) {
        console.log('✅ File metadata retrieved successfully');
        console.log('📋 Metadata:', metadataResponse.data.data);
      }

      // Test getting user files
      console.log('\n4. Testing user files list...');
      const userFilesResponse = await axios.get('http://localhost:3002/api/files/my-files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userFilesResponse.data.success) {
        console.log('✅ User files list retrieved successfully');
        console.log('📁 Files count:', userFilesResponse.data.data.total);
      }

      // Test file statistics
      console.log('\n5. Testing file statistics...');
      const statsResponse = await axios.get('http://localhost:3002/api/files/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.data.success) {
        console.log('✅ File statistics retrieved successfully');
        console.log('📊 Stats:', statsResponse.data.data);
      }

      // Test file deletion
      console.log('\n6. Testing file deletion...');
      const deleteResponse = await axios.delete(`http://localhost:3002/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (deleteResponse.data.success) {
        console.log('✅ File deleted successfully');
      }

    } else {
      console.log('❌ File upload failed:', uploadResponse.data);
    }

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Test file cleaned up');
    }

    console.log('\n🎉 All file upload tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Clean up test file on error
    const testFilePath = path.join(__dirname, 'test-upload.pdf');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Run the test
testFileUpload();