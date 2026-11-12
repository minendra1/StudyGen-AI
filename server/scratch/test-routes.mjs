// scratch/test-routes.mjs  — route-level integration tests using real Express
// Mocks groqClient so no real API calls are made.
import express from 'express';
import { Router } from 'express';
import { StudyCardSchema } from '../lib/cardSchema.js';
import { AppError, ErrorCode } from '../lib/errors.js';

// ── Minimal mock infrastructure ───────────────────────────────────────────────
let mockBehavior = 'valid'; // 'valid' | 'malformed_json' | 'schema_mismatch' | 'upstream' | 'timeout'

const validCard = {
  title: 'Test Topic',
  summary: 'A concise summary.',
  difficulty: 'beginner',
  concepts: [{ term: 'Term', definition: 'Def' }],
  flashcards: [{ front: 'Q', back: 'A' }],
  quiz: [{ question: 'Q?', options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanation: 'Because A.' }],
};

async function mockGenerateStudyCard(topic) {
  if (mockBehavior === 'valid') return JSON.parse(JSON.stringify(validCard));
  if (mockBehavior === 'malformed_json')
    throw new AppError(502, ErrorCode.INVALID_AI_RESPONSE, 'The AI returned a malformed response. Please retry.');
  if (mockBehavior === 'schema_mismatch')
    throw new AppError(502, ErrorCode.INVALID_AI_RESPONSE, 'The AI returned a response that does not match the expected structure. Please retry.');
  if (mockBehavior === 'upstream')
    throw new AppError(502, ErrorCode.UPSTREAM_FAILURE, 'The AI service is unavailable. Please try again later.');
  if (mockBehavior === 'timeout')
    throw new AppError(504, ErrorCode.TIMEOUT, 'The AI request timed out. Please try again.');
}

// ── Build a test Express app ──────────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());

  // Inline the route logic so we can inject mockGenerateStudyCard
  const router = Router();
  router.post('/', async (req, res, next) => {
    try {
      const raw = req.body?.topic;
      if (typeof raw !== 'string') throw new AppError(422, ErrorCode.INVALID_INPUT, 'topic must be a string.');
      const topic = raw.trim();
      if (topic.length === 0) throw new AppError(422, ErrorCode.INVALID_INPUT, 'topic must not be empty.');
      if (topic.length > 5000) throw new AppError(422, ErrorCode.INVALID_INPUT, 'topic too long.');
      const parsed = await mockGenerateStudyCard(topic);
      const result = StudyCardSchema.safeParse(parsed);
      if (!result.success) throw new AppError(502, ErrorCode.INVALID_AI_RESPONSE, 'Schema mismatch.');
      res.status(200).json({ data: result.data });
    } catch (err) { next(err); }
  });
  app.use('/api/generate', router);

  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.code, message: err.message });
    res.status(500).json({ error: 'internal_error', message: 'Unexpected error.' });
  });
  return app;
}

// ── Minimal fetch-like helper using Node http ─────────────────────────────────
import http from 'http';

function request(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : '';
      const opts = {
        hostname: 'localhost', port, path, method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; process.exitCode = 1; }
}

const app = buildApp();
console.log('\n── Route Integration Tests ───────────────────────────────────');

// 1. Valid topic → 200
mockBehavior = 'valid';
let r = await request(app, 'POST', '/api/generate', { topic: 'Operating Systems' });
assert('Valid topic → 200', r.status === 200, `got ${r.status}`);
assert('Response has data.title', typeof r.body?.data?.title === 'string');
assert('Response has data.flashcards', Array.isArray(r.body?.data?.flashcards));
assert('Response has data.quiz', Array.isArray(r.body?.data?.quiz));

// 2. Empty topic → 422
r = await request(app, 'POST', '/api/generate', { topic: '' });
assert('Empty topic → 422', r.status === 422, `got ${r.status}`);
assert('Error code is invalid_input', r.body.error === 'invalid_input');

// 3. Whitespace-only topic → 422
r = await request(app, 'POST', '/api/generate', { topic: '   ' });
assert('Whitespace-only topic → 422', r.status === 422, `got ${r.status}`);

// 4. Topic > 5000 chars → 422
r = await request(app, 'POST', '/api/generate', { topic: 'x'.repeat(5001) });
assert('Topic > 5000 chars → 422', r.status === 422, `got ${r.status}`);

// 5. Topic exactly 5000 chars → 200
mockBehavior = 'valid';
r = await request(app, 'POST', '/api/generate', { topic: 'x'.repeat(5000) });
assert('Topic = 5000 chars → 200', r.status === 200, `got ${r.status}`);

// 6. Missing topic field → 422
r = await request(app, 'POST', '/api/generate', {});
assert('Missing topic field → 422', r.status === 422, `got ${r.status}`);

// 7. Malformed JSON from AI → 502
mockBehavior = 'malformed_json';
r = await request(app, 'POST', '/api/generate', { topic: 'test' });
assert('Malformed AI JSON → 502', r.status === 502, `got ${r.status}`);
assert('Error code is invalid_ai_response', r.body.error === 'invalid_ai_response');

// 8. Schema mismatch from AI → 502
mockBehavior = 'schema_mismatch';
r = await request(app, 'POST', '/api/generate', { topic: 'test' });
assert('AI schema mismatch → 502', r.status === 502, `got ${r.status}`);
assert('Error code is invalid_ai_response (mismatch)', r.body.error === 'invalid_ai_response');

// 9. Upstream failure → 502
mockBehavior = 'upstream';
r = await request(app, 'POST', '/api/generate', { topic: 'test' });
assert('Upstream failure → 502', r.status === 502, `got ${r.status}`);
assert('Error code is upstream_failure', r.body.error === 'upstream_failure');

// 10. Timeout → 504
mockBehavior = 'timeout';
r = await request(app, 'POST', '/api/generate', { topic: 'test' });
assert('Timeout → 504', r.status === 504, `got ${r.status}`);
assert('Error code is timeout', r.body.error === 'timeout');

console.log(`\n── Results: ${passed} passed, ${failed} failed ──────────────────────────\n`);

