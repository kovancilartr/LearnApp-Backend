#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001/api/auth"
PASSED=0
FAILED=0
TOTAL=0

# Function to log test results
log_test() {
    echo -e "\n${BOLD}${BLUE}🧪 Testing: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    ((TOTAL++))
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        log_success "$method $endpoint - Status: $http_code $description"
        return 0
    else
        log_error "$method $endpoint - Expected: $expected_status, Got: $http_code"
        if [ ! -z "$body" ]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

# Function to test protected endpoint
test_protected_endpoint() {
    local endpoint=$1
    local token=$2
    local expected_status=$3
    local description=$4
    
    ((TOTAL++))
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        log_success "GET $endpoint - Status: $http_code $description"
        return 0
    else
        log_error "GET $endpoint - Expected: $expected_status, Got: $http_code"
        if [ ! -z "$body" ]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

echo -e "${BOLD}${BLUE}🚀 LearnApp Authentication Endpoint Tests${NC}\n"

# Test 1: Health check
log_test "Health Check"
health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3001/health 2>/dev/null)
health_code=$(echo $health_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
if [ "$health_code" -eq "200" ]; then
    log_success "Health check passed - Status: $health_code"
    ((PASSED++))
else
    log_warning "Health endpoint not available, continuing with auth tests..."
fi
((TOTAL++))

# Test 2: Register - Missing fields
log_test "Register Validation - Missing Fields"
test_endpoint "POST" "/register" '{}' 400 "(Missing required fields)"

# Test 3: Register - Invalid email
log_test "Register Validation - Invalid Email"
test_endpoint "POST" "/register" '{
    "email": "invalid-email",
    "password": "ValidPassword123!",
    "name": "Test User",
    "role": "STUDENT"
}' 400 "(Invalid email format)"

# Test 4: Register - Weak password
log_test "Register Validation - Weak Password"
test_endpoint "POST" "/register" '{
    "email": "test@example.com",
    "password": "weak",
    "name": "Test User",
    "role": "STUDENT"
}' 400 "(Weak password)"

# Test 5: Register - Invalid role
log_test "Register Validation - Invalid Role"
test_endpoint "POST" "/register" '{
    "email": "test@example.com",
    "password": "ValidPassword123!",
    "name": "Test User",
    "role": "INVALID_ROLE"
}' 400 "(Invalid role)"

# Test 6: Register - Valid data
log_test "Register - Valid Data"
((TOTAL++))
response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{
    "email": "testuser@example.com",
    "password": "MySecure123!",
    "name": "Test User",
    "role": "STUDENT"
}' "$BASE_URL/register")

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq "201" ]; then
    log_success "Registration successful - New user created"
elif [ "$http_code" -eq "409" ]; then
    log_warning "Registration failed - User already exists (expected if running multiple times)"
    ((PASSED++))
else
    log_error "Registration failed with unexpected status: $http_code"
    echo "Response: $body"
fi

# Test 7: Login - Missing fields
log_test "Login Validation - Missing Fields"
test_endpoint "POST" "/login" '{}' 400 "(Missing credentials)"

# Test 8: Login - Invalid email
log_test "Login Validation - Invalid Email"
test_endpoint "POST" "/login" '{
    "email": "invalid-email",
    "password": "password123"
}' 400 "(Invalid email format)"

# Test 9: Login - Invalid credentials
log_test "Login - Invalid Credentials"
test_endpoint "POST" "/login" '{
    "email": "nonexistent@example.com",
    "password": "wrongpassword"
}' 401 "(Invalid credentials)"

# Test 10: Check Email - Valid format
log_test "Check Email - Valid Format"
test_endpoint "POST" "/check-email" '{
    "email": "test@example.com"
}' 200 "(Valid email format)"

# Test 11: Check Email - Invalid format
log_test "Check Email - Invalid Format"
test_endpoint "POST" "/check-email" '{
    "email": "invalid-email"
}' 400 "(Invalid email format)"

# Test 12: Refresh Token - Missing token
log_test "Refresh Token - Missing Token"
test_endpoint "POST" "/refresh" '{}' 400 "(Missing refresh token)"

# Test 13: Refresh Token - Invalid token
log_test "Refresh Token - Invalid Token"
test_endpoint "POST" "/refresh" '{
    "refreshToken": "invalid-token"
}' 401 "(Invalid refresh token)"

# Test 14: Validate Token - Missing token
log_test "Validate Token - Missing Token"
test_endpoint "POST" "/validate-token" '{}' 400 "(Missing token)"

# Test 15: Logout - Missing token
log_test "Logout - Missing Token"
test_endpoint "POST" "/logout" '{}' 400 "(Missing refresh token)"

# Test 16: Protected endpoint without auth
log_test "Protected Endpoint - No Auth"
test_protected_endpoint "/me" "" 401 "(No authentication)"

# Test 17: Protected endpoint with invalid token
log_test "Protected Endpoint - Invalid Token"
test_protected_endpoint "/me" "invalid-token" 401 "(Invalid token)"

# Summary
echo -e "\n${BOLD}${BLUE}📊 Test Results Summary${NC}"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📈 Total: $TOTAL${NC}"

if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc -l)
    echo -e "${YELLOW}🎯 Success Rate: ${SUCCESS_RATE}%${NC}"
fi

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}🎉 All tests passed! Authentication validation and error handling is working correctly.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}${BOLD}⚠️  Some tests failed. Please check the implementation.${NC}"
    exit 1
fi