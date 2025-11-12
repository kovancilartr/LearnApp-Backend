import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

/**
 * Database constraint validation utilities
 */
export class ValidationUtils {
  /**
   * Check if email is unique (excluding current user)
   */
  static async isEmailUnique(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true }
      });

      if (!existingUser) return true;
      if (excludeUserId && existingUser.id === excludeUserId) return true;
      
      return false;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return false;
    }
  }

  /**
   * Check if filename is unique (excluding current file)
   */
  static async isFilenameUnique(filename: string, excludeFileId?: string): Promise<boolean> {
    try {
      const existingFile = await prisma.file.findUnique({
        where: { filename },
        select: { id: true }
      });

      if (!existingFile) return true;
      if (excludeFileId && existingFile.id === excludeFileId) return true;
      
      return false;
    } catch (error) {
      console.error('Error checking filename uniqueness:', error);
      return false;
    }
  }

  /**
   * Check if section order is unique within course (excluding current section)
   */
  static async isSectionOrderUnique(courseId: string, order: number, excludeSectionId?: string): Promise<boolean> {
    try {
      const existingSection = await prisma.section.findFirst({
        where: {
          courseId,
          order,
          ...(excludeSectionId && { id: { not: excludeSectionId } })
        },
        select: { id: true }
      });

      return !existingSection;
    } catch (error) {
      console.error('Error checking section order uniqueness:', error);
      return false;
    }
  }

  /**
   * Check if lesson order is unique within section (excluding current lesson)
   */
  static async isLessonOrderUnique(sectionId: string, order: number, excludeLessonId?: string): Promise<boolean> {
    try {
      const existingLesson = await prisma.lesson.findFirst({
        where: {
          sectionId,
          order,
          ...(excludeLessonId && { id: { not: excludeLessonId } })
        },
        select: { id: true }
      });

      return !existingLesson;
    } catch (error) {
      console.error('Error checking lesson order uniqueness:', error);
      return false;
    }
  }

  /**
   * Check if question order is unique within quiz (excluding current question)
   */
  static async isQuestionOrderUnique(quizId: string, order: number, excludeQuestionId?: string): Promise<boolean> {
    try {
      const existingQuestion = await prisma.question.findFirst({
        where: {
          quizId,
          order,
          ...(excludeQuestionId && { id: { not: excludeQuestionId } })
        },
        select: { id: true }
      });

      return !existingQuestion;
    } catch (error) {
      console.error('Error checking question order uniqueness:', error);
      return false;
    }
  }

  /**
   * Check if choice label is unique within question (excluding current choice)
   */
  static async isChoiceLabelUnique(questionId: string, label: string, excludeChoiceId?: string): Promise<boolean> {
    try {
      const existingChoice = await prisma.choice.findFirst({
        where: {
          questionId,
          label: label.toUpperCase(),
          ...(excludeChoiceId && { id: { not: excludeChoiceId } })
        },
        select: { id: true }
      });

      return !existingChoice;
    } catch (error) {
      console.error('Error checking choice label uniqueness:', error);
      return false;
    }
  }

  /**
   * Validate foreign key existence
   */
  static async validateForeignKey(table: string, id: string): Promise<boolean> {
    try {
      let result;
      
      switch (table) {
        case 'user':
          result = await prisma.user.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'course':
          result = await prisma.course.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'section':
          result = await prisma.section.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'lesson':
          result = await prisma.lesson.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'quiz':
          result = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'question':
          result = await prisma.question.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'student':
          result = await prisma.student.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'teacher':
          result = await prisma.teacher.findUnique({ where: { id }, select: { id: true } });
          break;
        case 'parent':
          result = await prisma.parent.findUnique({ where: { id }, select: { id: true } });
          break;
        default:
          return false;
      }

      return !!result;
    } catch (error) {
      console.error(`Error validating foreign key for ${table}:`, error);
      return false;
    }
  }

  /**
   * Validate data length constraints
   */
  static validateDataLength(data: Record<string, any>, constraints: Record<string, number>): string[] {
    const errors: string[] = [];

    for (const [field, maxLength] of Object.entries(constraints)) {
      const value = data[field];
      if (typeof value === 'string' && value.length > maxLength) {
        errors.push(`${field} must be less than ${maxLength} characters`);
      }
    }

    return errors;
  }

  /**
   * Sanitize and validate text input
   */
  static sanitizeText(text: string, options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
  } = {}): string {
    const { maxLength = 1000, allowHtml = false, trim = true } = options;

    let sanitized = text;

    // Trim whitespace
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags if not allowed
    if (!allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove null bytes and other dangerous characters
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Validate URL format and safety
   */
  static validateUrl(url: string, options: {
    allowedProtocols?: string[];
    maxLength?: number;
  } = {}): boolean {
    const { allowedProtocols = ['http', 'https'], maxLength = 500 } = options;

    try {
      if (url.length > maxLength) return false;

      const urlObj = new URL(url);
      
      // Check protocol
      const protocol = urlObj.protocol.slice(0, -1); // Remove trailing ':'
      if (!allowedProtocols.includes(protocol)) return false;

      // Check for dangerous characters
      if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate email format with additional security checks
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // Length check
    if (email.length > 255) {
      errors.push('Email must be less than 255 characters');
    }

    // Check for dangerous characters
    if (email.includes('<') || email.includes('>') || email.includes('"')) {
      errors.push('Email contains invalid characters');
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      errors.push('Email cannot contain consecutive dots');
    }

    // Check for leading/trailing dots
    if (email.startsWith('.') || email.endsWith('.')) {
      errors.push('Email cannot start or end with a dot');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Turkish name format
   */
  static validateTurkishName(name: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Length check
    if (name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    // Character check (Turkish characters allowed)
    const nameRegex = /^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s\-'\.]+$/;
    if (!nameRegex.test(name)) {
      errors.push('Name can only contain letters, spaces, hyphens, apostrophes, and dots');
    }

    // Check for excessive whitespace
    if (name.includes('  ')) {
      errors.push('Name cannot contain consecutive spaces');
    }

    // Check for leading/trailing whitespace
    if (name !== name.trim()) {
      errors.push('Name cannot start or end with whitespace');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quiz attempt integrity
   */
  static async validateQuizAttempt(
    studentId: string,
    quizId: string,
    responses: Array<{ questionId: string; choiceId: string }>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            include: {
              choices: true
            }
          }
        }
      });

      if (!quiz) {
        errors.push('Quiz not found');
        return { isValid: false, errors };
      }

      // Check if student is enrolled in the course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId,
          courseId: quiz.courseId
        }
      });

      if (!enrollment) {
        errors.push('Student is not enrolled in this course');
      }

      // Check attempt limits
      const attemptCount = await prisma.attempt.count({
        where: {
          studentId,
          quizId
        }
      });

      if (attemptCount >= quiz.attemptsAllowed) {
        errors.push('Maximum attempts exceeded');
      }

      // Validate responses
      const questionIds = quiz.questions.map(q => q.id);
      const responseQuestionIds = responses.map(r => r.questionId);

      // Check if all questions are answered
      const missingQuestions = questionIds.filter(id => !responseQuestionIds.includes(id));
      if (missingQuestions.length > 0) {
        errors.push('Not all questions are answered');
      }

      // Check for duplicate responses
      const uniqueQuestionIds = new Set(responseQuestionIds);
      if (uniqueQuestionIds.size !== responseQuestionIds.length) {
        errors.push('Duplicate question responses found');
      }

      // Validate each response
      for (const response of responses) {
        const question = quiz.questions.find(q => q.id === response.questionId);
        if (!question) {
          errors.push(`Invalid question ID: ${response.questionId}`);
          continue;
        }

        const choice = question.choices.find(c => c.id === response.choiceId);
        if (!choice) {
          errors.push(`Invalid choice ID: ${response.choiceId} for question: ${response.questionId}`);
        }
      }

    } catch (error) {
      console.error('Error validating quiz attempt:', error);
      errors.push('Internal validation error');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Custom Zod refinements for database constraints
 */
export const customRefinements = {
  uniqueEmail: (excludeUserId?: string) => 
    z.string().refine(
      async (email) => await ValidationUtils.isEmailUnique(email, excludeUserId),
      'Email is already in use'
    ),

  uniqueFilename: (excludeFileId?: string) =>
    z.string().refine(
      async (filename) => await ValidationUtils.isFilenameUnique(filename, excludeFileId),
      'Filename is already in use'
    ),

  validForeignKey: (table: string) =>
    z.string().refine(
      async (id) => await ValidationUtils.validateForeignKey(table, id),
      `Invalid ${table} ID`
    ),

  turkishName: z.string().refine(
    (name) => ValidationUtils.validateTurkishName(name).isValid,
    (name) => ({ message: ValidationUtils.validateTurkishName(name).errors.join(', ') })
  ),

  safeUrl: z.string().refine(
    (url) => ValidationUtils.validateUrl(url),
    'Invalid or unsafe URL'
  )
};