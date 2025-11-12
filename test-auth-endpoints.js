#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.bold}${colors.blue}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

async function testEndpoint(method, endpoint, data = null, expectedStatus = 200, description = '') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      validateStatus: () => true, // Don't throw on any status
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      logSuccess(`${method} ${endpoint} - Status: ${response.status} ${description}`);
      return { success: true, data: response.data, status: response.status };
    } else {
      logError(`${method} ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`);
      if (response.data) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      return { success: false, data: response.data, status: response.status };
    }
  } catch (error) {
    logError(`${method} ${endpoint} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.blue}🚀 LearnApp Authentication Endpoint Tests${colors.reset}\n`);
  
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Health check (if available)
  logTest('Health Check');
  try {
    const healthResponse = await axios.get('http://localhost:3001/health');
    logSuccess(`Health check passed - Status: ${healthResponse.status}`);
    testResults.passed++;
  } catch (error) {
    logWarning('Health endpoint not available, continuing with auth tests...');
  }
  testResults.total++;

  // Test 2: Register - Missing fields (should fail with validation error)
  logTest('Register Validation - Missing Fields');
  const registerMissingFields = await testEndpoint('POST', '/register', {}, 400, '(Missing required fields)');
  if (registerMissingFields.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 3: Register - Invalid email format
  logTest('Register Validation - Invalid Email');
  const registerInvalidEmail = await testEndpoint('POST', '/register', {
    email: 'invalid-email',
    password: 'ValidPassword123!',
    name: 'Test User',
    role: 'STUDENT'
  }, 400, '(Invalid email format)');
  if (registerInvalidEmail.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 4: Register - Weak password
  logTest('Register Validation - Weak Password');
  const registerWeakPassword = await testEndpoint('POST', '/register', {
    email: 'test@example.com',
    password: 'weak',
    name: 'Test User',
    role: 'STUDENT'
  }, 400, '(Weak password)');
  if (registerWeakPassword.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 5: Register - Invalid role
  logTest('Register Validation - Invalid Role');
  const registerInvalidRole = await testEndpoint('POST', '/register', {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    name: 'Test User',
    role: 'INVALID_ROLE'
  }, 400, '(Invalid role)');
  if (registerInvalidRole.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 6: Register - Valid data (should succeed or fail with duplicate email)
  logTest('Register - Valid Data');
  const registerValid = await testEndpoint('POST', '/register', {
    email: 'testuser@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
    role: 'STUDENT'
  }, null, '(Valid registration data)');
  
  if (registerValid.status === 201) {
    logSuccess('Registration successful - New user created');
    testResults.passed++;
  } else if (registerValid.status === 409) {
    logWarning('Registration failed - User already exists (expected if running multiple times)');
    testResults.passed++;
  } else {
    logError(`Registration failed with unexpected status: ${registerValid.status}`);
    testResults.failed++;
  }
  testResults.total++;

  // Test 7: Login - Missing fields
  logTest('Login Validation - Missing Fields');
  const loginMissingFields = await testEndpoint('POST', '/login', {}, 400, '(Missing credentials)');
  if (loginMissingFields.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 8: Login - Invalid email format
  logTest('Login Validation - Invalid Email');
  const loginInvalidEmail = await testEndpoint('POST', '/login', {
    email: 'invalid-email',
    password: 'password123'
  }, 400, '(Invalid email format)');
  if (loginInvalidEmail.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 9: Login - Invalid credentials
  logTest('Login - Invalid Credentials');
  const loginInvalid = await testEndpoint('POST', '/login', {
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  }, 401, '(Invalid credentials)');
  if (loginInvalid.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 10: Check Email - Valid email
  logTest('Check Email - Valid Format');
  const checkEmailValid = await testEndpoint('POST', '/check-email', {
    email: 'test@example.com'
  }, 200, '(Valid email format)');
  if (checkEmailValid.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 11: Check Email - Invalid format
  logTest('Check Email - Invalid Format');
  const checkEmailInvalid = await testEndpoint('POST', '/check-email', {
    email: 'invalid-email'
  }, 400, '(Invalid email format)');
  if (checkEmailInvalid.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 12: Refresh Token - Missing token
  logTest('Refresh Token - Missing Token');
  const refreshMissing = await testEndpoint('POST', '/refresh', {}, 400, '(Missing refresh token)');
  if (refreshMissing.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 13: Refresh Token - Invalid token
  logTest('Refresh Token - Invalid Token');
  const refreshInvalid = await testEndpoint('POST', '/refresh', {
    refreshToken: 'invalid-token'
  }, 401, '(Invalid refresh token)');
  if (refreshInvalid.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 14: Validate Token - Missing token
  logTest('Validate Token - Missing Token');
  const validateMissing = await testEndpoint('POST', '/validate-token', {}, 400, '(Missing token)');
  if (validateMissing.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 15: Logout - Missing token
  logTest('Logout - Missing Token');
  const logoutMissing = await testEndpoint('POST', '/logout', {}, 400, '(Missing refresh token)');
  if (logoutMissing.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 16: Protected endpoint without auth (should fail)
  logTest('Protected Endpoint - No Auth');
  const protectedNoAuth = await testEndpoint('GET', '/me', null, 401, '(No authentication)');
  if (protectedNoAuth.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;

  // Test 17: Protected endpoint with invalid token
  logTest('Protected Endpoint - Invalid Token');
  try {
    const response = await axios.get(`${BASE_URL}/me`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      logSuccess('GET /me - Status: 401 (Invalid token)');
      testResults.passed++;
    } else {
      logError(`GET /me - Expected: 401, Got: ${response.status}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`GET /me - Error: ${error.message}`);
    testResults.failed++;
  }
  testResults.total++;

  // Summary
  console.log(`\n${colors.bold}${colors.blue}📊 Test Results Summary${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.blue}📈 Total: ${testResults.total}${colors.reset}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`${colors.yellow}🎯 Success Rate: ${successRate}%${colors.reset}`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All tests passed! Authentication validation and error handling is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some tests failed. Please check the implementation.${colors.reset}`);
  }

  // Test validation error format
  console.log(`\n${colors.bold}${colors.blue}🔍 Sample Validation Error Response:${colors.reset}`);
  if (registerMissingFields.data) {
    console.log(JSON.stringify(registerMissingFields.data, null, 2));
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});