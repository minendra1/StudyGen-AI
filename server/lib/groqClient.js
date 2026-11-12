// server/lib/groqClient.js
// Wraps the Groq SDK. Calls the chat completion API with structured JSON output.

import Groq, { APIConnectionTimeoutError, APIUserAbortError } from 'groq-sdk';
import { studyCardJsonSchema } from './cardSchema.js';
import { AppError, ErrorCode } from './errors.js';

const MODEL = 'openai/gpt-oss-20b';
const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds

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
- concepts: an array of key concept objects, each with "term" and "definition" (at least 3 concepts)
- flashcards: an array of 8 flashcard objects by default (minimum 5, maximum 10), covering different important concepts with no duplicates. Each flashcard has:
    - "front": a concise question or term
    - "back": an accurate, revision-friendly answer or explanation
- quiz: an array of 8 multiple-choice question objects by default (minimum 5, maximum 10), covering different concepts with no duplicate or ambiguous questions. Each question must have:
    - "question": the question text
    - "options": an array of exactly 4 distinct answer choices
    - "answerIndex": an integer 0–3 indicating the single correct option
    - "explanation": a clear sentence explaining why that answer is correct

Ensure flashcards has between 5 and 10 items (target 8) and quiz has between 5 and 10 items (target 8).`;

/**
 * Calls the Groq API and returns a raw parsed JSON object (not yet Zod-validated).
 *
 * @param {string} topic  User-supplied study topic
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]     Optional external abort signal (e.g. client disconnect)
 * @param {number} [options.timeoutMs]       Override timeout in ms (defaults to 30,000 ms)
 * @param {object} [options.client]          Optional Groq-compatible client for testing
 * @returns {Promise<unknown>}  Parsed JSON from the model
 * @throws {AppError}  On timeout, upstream failure, or malformed response
 */
export async function generateStudyCard(topic, options = {}) {
  const {
    signal: externalSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    client = getGroq(),
  } = options;

  const timeoutController = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);

  const combinedSignal = externalSignal
    ? AbortSignal.any([timeoutController.signal, externalSignal])
    : timeoutController.signal;

  let completion;
  try {
    completion = await client.chat.completions.create(
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
      { signal: combinedSignal },
    );
  } catch (err) {
    // Timeout (either our 30s AbortController or Groq SDK's APIConnectionTimeoutError)
    if (
      timedOut ||
      err instanceof APIConnectionTimeoutError ||
      (!externalSignal?.aborted &&
        (err instanceof APIUserAbortError || err?.name === 'AbortError' || err?.code === 'ERR_OPERATION_ABORTED'))
    ) {
      throw new AppError(504, ErrorCode.TIMEOUT, 'The AI request timed out. Please try again.');
    }

    // Client disconnected prematurely
    if (externalSignal?.aborted && (err instanceof APIUserAbortError || err?.name === 'AbortError')) {
      throw new AppError(499, ErrorCode.UPSTREAM_FAILURE, 'Request was cancelled by the client.');
    }

    // Groq SDK surfaces API errors as instances with a .status property.
    const status = err?.status;
    if (status === 401 || status === 403) {
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
