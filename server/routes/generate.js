// server/routes/generate.js
// POST /api/generate — validates input, calls Groq, validates output, responds.

import { Router } from 'express';
import { generateStudyCard } from '../lib/groqClient.js';
import { StudyCardSchema } from '../lib/cardSchema.js';
import { AppError, ErrorCode } from '../lib/errors.js';

const router = Router();

const MAX_TOPIC_LENGTH = 5000;

router.post('/', async (req, res, next) => {
  try {
    // ── 1. Input validation ──────────────────────────────────────────────────
    const raw = req.body?.topic;

    if (typeof raw !== 'string') {
      throw new AppError(422, ErrorCode.INVALID_INPUT, 'topic must be a string.');
    }

    const topic = raw.trim();

    if (topic.length === 0) {
      throw new AppError(422, ErrorCode.INVALID_INPUT, 'topic must not be empty or whitespace-only.');
    }

    if (topic.length > MAX_TOPIC_LENGTH) {
      throw new AppError(
        422,
        ErrorCode.INVALID_INPUT,
        `topic must not exceed ${MAX_TOPIC_LENGTH} characters.`,
      );
    }

    // ── 2. Call Groq (may throw AppError on failure/timeout) ─────────────────
    const parsed = await generateStudyCard(topic);

    // ── 3. Zod validation ────────────────────────────────────────────────────
    const result = StudyCardSchema.safeParse(parsed);

    if (!result.success) {
      // Log the Zod errors server-side for debugging; never send them to client.
      console.error('[generate] Zod validation failed:', JSON.stringify(result.error.issues, null, 2));
      throw new AppError(
        502,
        ErrorCode.INVALID_AI_RESPONSE,
        'The AI returned a response that does not match the expected structure. Please retry.',
      );
    }

    // ── 4. Respond with validated data ───────────────────────────────────────
    res.status(200).json({ data: result.data });
  } catch (err) {
    next(err); // Forward to global error handler
  }
});

export default router;

