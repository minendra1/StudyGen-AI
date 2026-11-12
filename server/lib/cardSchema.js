// server/lib/cardSchema.js
// Zod schema — single source of truth for the AI response shape.
// Also exports a plain JSON Schema object for the Groq structured-output call.

import { z } from 'zod';

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const ConceptSchema = z.object({
  term: z.string().min(1, 'term must not be empty'),
  definition: z.string().min(1, 'definition must not be empty'),
});

const FlashcardSchema = z.object({
  front: z.string().min(1, 'front must not be empty'),
  back: z.string().min(1, 'back must not be empty'),
});

const QuizItemSchema = z.object({
  question: z.string().min(1, 'question must not be empty'),
  options: z
    .array(z.string().min(1, 'option must not be empty'))
    .length(4, 'each quiz item must have exactly 4 options'),
  answerIndex: z
    .number()
    .int()
    .min(0)
    .max(3, 'answerIndex must be 0–3'),
  explanation: z.string().min(1, 'explanation must not be empty'),
});

// ── Root schema ────────────────────────────────────────────────────────────────

export const StudyCardSchema = z.object({
  title: z.string().min(1, 'title must not be empty'),
  summary: z.string().min(1, 'summary must not be empty'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  concepts: z.array(ConceptSchema).min(1, 'at least one concept required'),
  flashcards: z.array(FlashcardSchema).min(1, 'at least one flashcard required'),
  quiz: z.array(QuizItemSchema).min(1, 'at least one quiz item required'),
});

// ── JSON Schema for Groq structured output ─────────────────────────────────────
// Hand-authored to match StudyCardSchema exactly.
// Groq strict mode requires: type declared on every node, no $schema, no $ref.

export const studyCardJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          definition: { type: 'string' },
        },
        required: ['term', 'definition'],
        additionalProperties: false,
      },
    },
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
        additionalProperties: false,
      },
    },
    quiz: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
          },
          answerIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'answerIndex', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'summary', 'difficulty', 'concepts', 'flashcards', 'quiz'],
  additionalProperties: false,
};

