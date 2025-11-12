import { loginSchema, registerSchema, refreshTokenRequestSchema } from '../schemas/auth.schema';

describe('Auth Schema Validation', () => {
  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'invalid-email',
          password: 'password123'
        }
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'email'],
              message: 'Please enter a valid email address'
            })
          ])
        );
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com'
        }
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'password'],
              message: 'Password is required'
            })
          ])
        );
      }
    });
  });

  describe('Register Schema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        body: {
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
          name: 'Jane Smith',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const invalidData = {
        body: {
          email: 'user@example.com',
          password: 'weak',
          name: 'John Smith',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
        expect(result.error.errors.some(err => 
          err.path.includes('password') && 
          err.message.includes('at least 8 characters')
        )).toBe(true);
      }
    });

    it('should reject invalid role', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          name: 'Test User',
          role: 'INVALID_ROLE'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'role'],
              message: 'Role must be one of: ADMIN, TEACHER, STUDENT, PARENT'
            })
          ])
        );
      }
    });

    it('should reject name with invalid characters', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          name: 'Test User 123',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'name'],
              message: 'Name can only contain letters, spaces, hyphens, apostrophes, and dots'
            })
          ])
        );
      }
    });

    it('should reject email with consecutive dots', () => {
      const invalidData = {
        body: {
          email: 'test..user@example.com',
          password: 'ValidPassword123!',
          name: 'Test User',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'email'],
              message: 'Email cannot contain consecutive dots'
            })
          ])
        );
      }
    });

    it('should reject password with whitespace', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Valid Password123!',
          name: 'Test User',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'password'],
              message: 'Password cannot contain whitespace characters'
            })
          ])
        );
      }
    });

    it('should reject password with common words', () => {
      const invalidData = {
        body: {
          email: 'user@example.com',
          password: 'Password123!',
          name: 'John Smith',
          role: 'STUDENT'
        }
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'password'],
              message: 'Password cannot contain common words'
            })
          ])
        );
      }
    });
  });

  describe('Refresh Token Schema', () => {
    it('should validate correct refresh token data', () => {
      const validData = {
        body: {
          refreshToken: 'valid-refresh-token-string'
        }
      };

      const result = refreshTokenRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        body: {
          refreshToken: ''
        }
      };

      const result = refreshTokenRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'refreshToken'],
              message: 'Refresh token cannot be empty'
            })
          ])
        );
      }
    });

    it('should reject missing refresh token', () => {
      const invalidData = {
        body: {}
      };

      const result = refreshTokenRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['body', 'refreshToken'],
              message: 'Refresh token is required'
            })
          ])
        );
      }
    });
  });
});