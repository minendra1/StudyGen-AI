// server/lib/cardSchema.js
// Zod schema — single source of truth for the AI response shape.
// Also exports a plain JSON Schema object for the Groq structured-output call.

import { z } from 'zod';

const nonEmptyTrimmed = (field) =>
  z.string().trim().min(1, `${field} must not be empty`);

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const ConceptSchema = z.object({
  term: nonEmptyTrimmed('term'),
  definition: nonEmptyTrimmed('definition'),
});

const FlashcardSchema = z.object({
  front: nonEmptyTrimmed('front'),
  back: nonEmptyTrimmed('back'),
});

const QuizItemSchema = z.object({
  question: nonEmptyTrimmed('question'),
  options: z
    .array(nonEmptyTrimmed('option'))
    .length(4, 'each quiz item must have exactly 4 options'),
  answerIndex: z
    .number()
    .int()
    .min(0)
    .max(3, 'answerIndex must be 0–3'),
  explanation: nonEmptyTrimmed('explanation'),
});

// ── Root schema ────────────────────────────────────────────────────────────────

export const StudyCardSchema = z.object({
  title: nonEmptyTrimmed('title'),
  summary: nonEmptyTrimmed('summary'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  concepts: z.array(ConceptSchema).min(1, 'at least one concept required'),
  flashcards: z
    .array(FlashcardSchema)
    .min(5, 'at least 5 flashcards required')
    .max(10, 'at most 10 flashcards required'),
  quiz: z
    .array(QuizItemSchema)
    .min(5, 'at least 5 quiz questions required')
    .max(10, 'at most 10 quiz questions required'),
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
      minItems: 5,
      maxItems: 10,
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
      minItems: 5,
      maxItems: 10,
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
