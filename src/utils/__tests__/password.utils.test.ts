import { 
  hashPassword, 
  comparePassword, 
  validatePasswordStrength,
  generateSecurePassword,
  generateSalt
} from '../password.utils';

describe('Password Utils', () => {
  describe('Password Hashing', () => {
    test('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password, true); // Skip validation for test
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    test('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password, true); // Skip validation for test
      const hash2 = await hashPassword(password, true); // Skip validation for test
      
      expect(hash1).not.toBe(hash2); // Due to salt
    });

    test('should throw error for invalid password', async () => {
      const weakPassword = '123';
      await expect(hashPassword(weakPassword)).rejects.toThrow();
    });
  });

  describe('Password Comparison', () => {
    test('should compare password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password, true); // Skip validation for test
      
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(password, true); // Skip validation for test
      
      const isMatch = await comparePassword(wrongPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });

    test('should handle empty passwords gracefully', async () => {
      const isMatch = await comparePassword('', '');
      expect(isMatch).toBe(false);
    });

    test('should handle null/undefined passwords gracefully', async () => {
      const isMatch1 = await comparePassword('test', '');
      const isMatch2 = await comparePassword('', 'hash');
      
      expect(isMatch1).toBe(false);
      expect(isMatch2).toBe(false);
    });
  });

  describe('Password Validation', () => {
    test('should validate strong password', () => {
      const strongPassword = 'MyStr0ng!P@ssw0rd#2024';
      const result = validatePasswordStrength(strongPassword);
      
      console.log('Password validation result:', result);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThan(70);
    });

    test('should reject weak password', () => {
      const weakPassword = '123';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThan(40);
    });

    test('should validate medium strength password', () => {
      const mediumPassword = 'Password123';
      const result = validatePasswordStrength(mediumPassword);
      
      expect(result.strength).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(70);
    });

    test('should detect common patterns', () => {
      const commonPassword = 'password123';
      const result = validatePasswordStrength(commonPassword);
      
      expect(result.errors.some(error => 
        error.includes('common patterns')
      )).toBe(true);
    });

    test('should detect sequential characters', () => {
      const sequentialPassword = 'Abcd1234!';
      const result = validatePasswordStrength(sequentialPassword);
      
      expect(result.errors.some(error => 
        error.includes('sequential characters')
      )).toBe(true);
    });

    test('should detect repeated characters', () => {
      const repeatedPassword = 'Aaaa1234!';
      const result = validatePasswordStrength(repeatedPassword);
      
      expect(result.errors.some(error => 
        error.includes('repeated characters')
      )).toBe(true);
    });

    test('should handle empty password', () => {
      const result = validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
      expect(result.strength).toBe('weak');
      expect(result.score).toBe(0);
    });

    test('should reject too long password', () => {
      const tooLongPassword = 'A'.repeat(130) + '1!';
      const result = validatePasswordStrength(tooLongPassword);
      
      expect(result.errors.some(error => 
        error.includes('must not exceed')
      )).toBe(true);
    });
  });

  describe('Password Generation', () => {
    test('should generate secure password with default length', () => {
      const password = generateSecurePassword();
      
      expect(password.length).toBe(16);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*(),.?":{}|<>]/.test(password)).toBe(true);
    });

    test('should generate secure password with custom length', () => {
      const password = generateSecurePassword(20);
      
      expect(password.length).toBe(20);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*(),.?":{}|<>]/.test(password)).toBe(true);
    });

    test('should generate different passwords each time', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });

    test('generated password should pass strength validation', () => {
      const password = generateSecurePassword();
      const result = validatePasswordStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });

  describe('Salt Generation', () => {
    test('should generate salt', () => {
      const salt = generateSalt();
      
      expect(salt).toBeDefined();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should generate different salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).not.toBe(salt2);
    });
  });
});