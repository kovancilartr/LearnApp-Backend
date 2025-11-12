import { z } from 'zod';

// Quiz Schemas
export const createQuizSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Quiz title is required')
      .max(200, 'Quiz title must be less than 200 characters')
      .trim(),
    courseId: z.string()
      .uuid('Invalid course ID format'),
    duration: z.number()
      .int('Duration must be an integer')
      .min(60, 'Duration must be at least 60 seconds')
      .max(14400, 'Duration cannot exceed 4 hours')
      .optional()
      .nullable(),
    attemptsAllowed: z.number()
      .int('Attempts allowed must be an integer')
      .min(1, 'At least 1 attempt must be allowed')
      .max(10, 'Maximum 10 attempts allowed')
      .default(1),
  }),
});

export const updateQuizSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Quiz title is required')
      .max(200, 'Quiz title must be less than 200 characters')
      .trim()
      .optional(),
    duration: z.number()
      .int('Duration must be an integer')
      .min(60, 'Duration must be at least 60 seconds')
      .max(14400, 'Duration cannot exceed 4 hours')
      .optional()
      .nullable(),
    attemptsAllowed: z.number()
      .int('Attempts allowed must be an integer')
      .min(1, 'At least 1 attempt must be allowed')
      .max(10, 'Maximum 10 attempts allowed')
      .optional(),
  }),
});

// Question Schemas
export const createQuestionSchema = z.object({
  body: z.object({
    text: z.string()
      .min(1, 'Question text is required')
      .max(1000, 'Question text must be less than 1000 characters')
      .trim(),
    imageUrl: z.string()
      .url('Invalid image URL format')
      .optional()
      .nullable(),
    order: z.number()
      .int('Order must be an integer')
      .min(1, 'Order must be at least 1')
      .optional(),
    choices: z.array(
      z.object({
        label: z.string()
          .min(1, 'Choice label is required')
          .max(1, 'Choice label must be a single character')
          .regex(/^[A-E]$/i, 'Choice label must be A, B, C, D, or E'),
        text: z.string()
          .min(1, 'Choice text is required')
          .max(500, 'Choice text must be less than 500 characters')
          .trim(),
        correct: z.boolean(),
      })
    )
    .min(2, 'At least 2 choices are required')
    .max(5, 'Maximum 5 choices allowed')
    .refine(
      (choices) => choices.filter(choice => choice.correct).length === 1,
      'Exactly one choice must be marked as correct'
    )
    .refine(
      (choices) => {
        const labels = choices.map(choice => choice.label.toUpperCase());
        return new Set(labels).size === labels.length;
      },
      'Choice labels must be unique'
    ),
  }),
});

export const updateQuestionSchema = z.object({
  body: z.object({
    text: z.string()
      .min(1, 'Question text is required')
      .max(1000, 'Question text must be less than 1000 characters')
      .trim()
      .optional(),
    imageUrl: z.string()
      .url('Invalid image URL format')
      .optional()
      .nullable(),
    order: z.number()
      .int('Order must be an integer')
      .min(1, 'Order must be at least 1')
      .optional(),
  }),
});

// Choice Schemas
export const updateChoiceSchema = z.object({
  body: z.object({
    label: z.string()
      .min(1, 'Choice label is required')
      .max(1, 'Choice label must be a single character')
      .regex(/^[A-E]$/i, 'Choice label must be A, B, C, D, or E')
      .optional(),
    text: z.string()
      .min(1, 'Choice text is required')
      .max(500, 'Choice text must be less than 500 characters')
      .trim()
      .optional(),
    correct: z.boolean()
      .optional(),
  }),
});

// Quiz Attempt Schemas with enhanced security validation
export const submitQuizAttemptSchema = z.object({
  body: z.object({
    responses: z.array(
      z.object({
        questionId: z.string()
          .uuid('Invalid question ID format')
          .min(1, 'Question ID is required'),
        choiceId: z.string()
          .uuid('Invalid choice ID format')
          .min(1, 'Choice ID is required'),
      })
    )
    .min(1, 'At least one response is required')
    .max(100, 'Too many responses - maximum 100 questions allowed')
    .refine(
      (responses) => {
        const questionIds = responses.map(r => r.questionId);
        return new Set(questionIds).size === questionIds.length;
      },
      'Duplicate question responses are not allowed'
    ),
    // Optional timestamp for timing validation
    submissionTime: z.string()
      .datetime('Invalid submission timestamp format')
      .optional(),
  }),
});

// Query Schemas
export const quizSearchQuerySchema = z.object({
  query: z.object({
    courseId: z.string()
      .uuid('Invalid course ID format')
      .optional(),
    search: z.string()
      .max(100, 'Search term must be less than 100 characters')
      .optional(),
    page: z.string()
      .regex(/^\d+$/, 'Page must be a positive integer')
      .transform(Number)
      .refine(val => val >= 1, 'Page must be at least 1')
      .optional(),
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
      .optional(),
  }),
});

// Validation helper types
export type CreateQuizInput = z.infer<typeof createQuizSchema>['body'];
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>['body'];
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>['body'];
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
export type UpdateChoiceInput = z.infer<typeof updateChoiceSchema>['body'];
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>['body'];
export type QuizSearchQueryInput = z.infer<typeof quizSearchQuerySchema>['query'];