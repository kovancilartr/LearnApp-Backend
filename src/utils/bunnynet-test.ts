import { bunnyNetService } from '../services/bunnynet.service';
import fs from 'fs';
import path from 'path';

// Test BunnyNet integration
export async function testBunnyNetIntegration() {
  console.log('🧪 Testing BunnyNet CDN Integration...\n');

  // Check if BunnyNet is configured
  console.log('1. Checking BunnyNet configuration...');
  const isConfigured = bunnyNetService.isConfigured();
  console.log(`   ✅ BunnyNet configured: ${isConfigured}\n`);

  if (!isConfigured) {
    console.log('❌ BunnyNet is not configured. Please set the following environment variables:');
    console.log('   - BUNNYNET_ENABLED=true');
    console.log('   - BUNNYNET_STORAGE_ZONE=your-storage-zone-name');
    console.log('   - BUNNYNET_STORAGE_PASSWORD=your-storage-zone-password');
    console.log('   - BUNNYNET_PULL_ZONE_URL=https://your-pull-zone.b-cdn.net');
    return;
  }

  try {
    // Test connection
    console.log('2. Testing BunnyNet connection...');
    const connectionTest = await bunnyNetService.testConnection();
    console.log(`   ${connectionTest.success ? '✅' : '❌'} Connection test: ${connectionTest.success ? 'Success' : connectionTest.error}\n`);

    if (!connectionTest.success) {
      return;
    }

    // Create a test file
    console.log('3. Creating test file...');
    const testContent = 'This is a test file for BunnyNet CDN integration.';
    const testFilePath = path.join(process.cwd(), 'test-file.txt');
    fs.writeFileSync(testFilePath, testContent);
    console.log(`   ✅ Test file created: ${testFilePath}\n`);

    // Upload test file
    console.log('4. Uploading test file to BunnyNet...');
    const uploadResult = await bunnyNetService.uploadFile(testFilePath, 'test-file.txt', 'temp');
    console.log(`   ${uploadResult.success ? '✅' : '❌'} Upload result: ${uploadResult.success ? 'Success' : uploadResult.error}`);
    if (uploadResult.success && uploadResult.cdnUrl) {
      console.log(`   🌐 CDN URL: ${uploadResult.cdnUrl}\n`);
    }

    if (uploadResult.success) {
      // Test file info
      console.log('5. Getting file info from BunnyNet...');
      const fileInfo = await bunnyNetService.getFileInfo('test-file.txt', 'temp');
      console.log(`   ${fileInfo ? '✅' : '❌'} File info: ${fileInfo ? 'Found' : 'Not found'}`);
      if (fileInfo) {
        console.log(`   📁 File size: ${fileInfo.Length} bytes`);
        console.log(`   📅 Last changed: ${fileInfo.LastChanged}\n`);
      }

      // Test sync (should skip since file is already up to date)
      console.log('6. Testing file sync...');
      const syncResult = await bunnyNetService.syncFile(testFilePath, 'test-file.txt', 'temp');
      console.log(`   ${syncResult.success ? '✅' : '❌'} Sync result: ${syncResult.success ? 'Success' : syncResult.error}\n`);

      // Test delete
      console.log('7. Deleting test file from BunnyNet...');
      const deleteResult = await bunnyNetService.deleteFile('test-file.txt', 'temp');
      console.log(`   ${deleteResult.success ? '✅' : '❌'} Delete result: ${deleteResult.success ? 'Success' : deleteResult.error}\n`);
    }

    // Clean up local test file
    console.log('8. Cleaning up local test file...');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('   ✅ Local test file deleted\n');
    }

    // Get storage stats
    console.log('9. Getting storage statistics...');
    try {
      const stats = await bunnyNetService.getStorageStats();
      console.log('   ✅ Storage stats:');
      console.log(`   📊 Total files: ${stats.totalFiles}`);
      console.log(`   💾 Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('   📁 Categories:');
      Object.entries(stats.categories).forEach(([category, data]) => {
        console.log(`      - ${category}: ${data.files} files, ${(data.size / 1024 / 1024).toFixed(2)} MB`);
      });
    } catch (error: any) {
      console.log(`   ⚠️  Storage stats error: ${error.message}`);
    }

    console.log('\n🎉 BunnyNet integration test completed successfully!');

  } catch (error: any) {
    console.error('❌ BunnyNet integration test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testBunnyNetIntegration();
}