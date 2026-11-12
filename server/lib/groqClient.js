// server/lib/groqClient.js
// Wraps the Groq SDK. Calls the chat completion API with structured JSON output.

import Groq from 'groq-sdk';
import { studyCardJsonSchema } from './cardSchema.js';
import { AppError, ErrorCode } from './errors.js';

const MODEL = 'openai/gpt-oss-20b';
const TIMEOUT_MS = 30_000; // 30 seconds

// Lazy singleton — only created on the first actual call.
// This lets index.js validate the env var and print a helpful message
// before the Groq SDK constructor throws its own error.
let _groq = null;
function getGroq() {
  if (!_groq) _groq = new Groq();
  return _groq;
}

const SYSTEM_PROMPT = `You are a study assistant. Given a topic or notes provided by the user, generate a concise, accurate study resource.

Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

The JSON must contain:
- title: a clear, descriptive title for the topic
- summary: a 2–4 sentence plain-language overview
- difficulty: exactly one of "beginner", "intermediate", or "advanced"
- concepts: an array of key concept objects, each with "term" and "definition"
- flashcards: an array of flashcard objects, each with "front" (question or term) and "back" (answer or explanation)
- quiz: an array of multiple-choice question objects. Each question must have:
    - "question": the question text
    - "options": an array of exactly 4 strings (the answer choices)
    - "answerIndex": an integer 0–3 indicating which option is correct
    - "explanation": a sentence explaining why that answer is correct

Generate at least 3 concepts, 3 flashcards, and 3 quiz questions.`;

/**
 * Calls the Groq API and returns a raw parsed JSON object (not yet Zod-validated).
 *
 * @param {string} topic  User-supplied study topic
 * @returns {Promise<unknown>}  Parsed JSON from the model
 * @throws {AppError}  On timeout, upstream failure, or malformed response
 */
export async function generateStudyCard(topic) {
  // AbortController provides the 30-second timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let completion;
  try {
    completion = await getGroq().chat.completions.create(
      {
        model: MODEL,
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'study_card',
            description: 'A structured study card for the given topic',
            schema: studyCardJsonSchema,
            strict: true,
          },
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Topic: ${topic}` },
        ],
      },
      { signal: controller.signal },
    );
  } catch (err) {
    // AbortError → timeout
    if (err.name === 'AbortError' || err.code === 'ERR_OPERATION_ABORTED') {
      throw new AppError(504, ErrorCode.TIMEOUT, 'The AI request timed out. Please try again.');
    }

    // Groq SDK surfaces API errors as instances with a .status property.
    const status = err?.status;
    if (status === 401 || status === 403) {
      // Log server-side only — never forward auth details to client.
      console.error('[groqClient] authentication error — check GROQ_API_KEY');
      throw new AppError(502, ErrorCode.UPSTREAM_FAILURE, 'AI service authentication failed.');
    }
    if (status === 429) {
      throw new AppError(502, ErrorCode.UPSTREAM_FAILURE, 'AI service rate limit exceeded. Please wait and retry.');
    }

    console.error('[groqClient] upstream error:', err?.message ?? err);
    throw new AppError(502, ErrorCode.UPSTREAM_FAILURE, 'The AI service is unavailable. Please try again later.');
  } finally {
    clearTimeout(timer);
  }

  // Extract the text content from the first choice.
  const rawText = completion?.choices?.[0]?.message?.content;
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new AppError(502, ErrorCode.INVALID_AI_RESPONSE, 'The AI returned an empty response.');
  }

  // Parse JSON — no regex repair. If it fails, reject immediately.
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[groqClient] JSON.parse failed. Raw response (first 300 chars):', rawText.slice(0, 300));
    throw new AppError(502, ErrorCode.INVALID_AI_RESPONSE, 'The AI returned a malformed response. Please retry.');
  }

  return parsed;
}
