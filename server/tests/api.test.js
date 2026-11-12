import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { APIConnectionTimeoutError, APIError } from 'groq-sdk';
import { createApp } from '../app.js';
import { generateStudyCard } from '../lib/groqClient.js';

function makeValidCard(flashcardCount = 8, quizCount = 8) {
  return {
    title: 'Operating Systems',
    summary: 'An OS manages hardware and software resources.',
    difficulty: 'beginner',
    concepts: [{ term: 'Kernel', definition: 'Core component of the OS.' }],
    flashcards: Array.from({ length: flashcardCount }, (_, i) => ({
      front: `What is concept ${i + 1}?`,
      back: `Answer for concept ${i + 1}.`,
    })),
    quiz: Array.from({ length: quizCount }, (_, i) => ({
      question: `Question ${i + 1}: What does an OS do?`,
      options: ['Manages resources', 'Writes apps', 'Renders HTML', 'Compiles C'],
      answerIndex: 0,
      explanation: `Explanation ${i + 1}: An OS manages hardware and software resources.`,
    })),
  };
}

async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function makeMockGroqClient(handler) {
  return {
    chat: {
      completions: {
        create: handler,
      },
    },
  };
}

describe('StudyGen AI Backend API', () => {
  it('GET /api/health returns 200 ok', async () => {
    const app = createApp();
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/health`);
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.status, 'ok');
    });
  });

  describe('Input validation (422)', () => {
    const app = createApp({
      generateCard: async () => makeValidCard(),
    });

    it('rejects missing, empty, whitespace-only, non-string, and >5000 char topics', async () => {
      await withServer(app, async (baseUrl) => {
        const invalidBodies = [
          {},
          { topic: '' },
          { topic: '   \n\t  ' },
          { topic: 12345 },
          { topic: null },
          { topic: ['array'] },
          { topic: 'a'.repeat(5001) },
        ];

        for (const payload of invalidBodies) {
          const res = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const body = await res.json();
          assert.equal(res.status, 422, `expected 422 for ${JSON.stringify(payload).slice(0, 40)}`);
          assert.equal(body.error, 'invalid_input');
        }
      });
    });

    it('rejects malformed JSON request body with 422', async () => {
      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{broken json',
        });
        const body = await res.json();
        assert.equal(res.status, 422);
        assert.equal(body.error, 'invalid_input');
      });
    });

    it('accepts valid topic and exactly 5000 char topic with 200', async () => {
      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: `  ${'a'.repeat(5000)}  ` }),
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.data.title, 'Operating Systems');
      });
    });
  });

  describe('AI response validation via mocked Groq SDK (502)', () => {
    const runWithGroqText = async (content) => {
      const mockClient = makeMockGroqClient(async () => ({
        choices: [{ message: { content } }],
      }));
      const app = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: mockClient }),
      });
      return withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        return { status: res.status, body: await res.json() };
      });
    };

    it('returns 200 for valid structured JSON from Groq', async () => {
      const res = await runWithGroqText(JSON.stringify(makeValidCard()));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'Operating Systems');
    });

    it('returns 502 invalid_ai_response for malformed JSON', async () => {
      const res = await runWithGroqText('{ "title": "Oops", not valid json');
      assert.equal(res.status, 502);
      assert.equal(res.body.error, 'invalid_ai_response');
    });

    it('returns 502 invalid_ai_response for empty AI responses', async () => {
      for (const empty of ['', '   ', null]) {
        const res = await runWithGroqText(empty);
        assert.equal(res.status, 502);
        assert.equal(res.body.error, 'invalid_ai_response');
      }
    });

    it('returns 502 invalid_ai_response for missing fields, bad difficulty, empty arrays, bad options, bad answerIndex, whitespace fields', async () => {
      const badPayloads = [
        { ...makeValidCard(), title: undefined },
        { ...makeValidCard(), difficulty: 'master' },
        { ...makeValidCard(), concepts: [] },
        { ...makeValidCard(), flashcards: [] },
        { ...makeValidCard(), quiz: [] },
        {
          ...makeValidCard(),
          quiz: [{ ...makeValidCard().quiz[0], options: ['A', 'B', 'C'] }],
        },
        {
          ...makeValidCard(),
          quiz: [{ ...makeValidCard().quiz[0], options: ['A', 'B', 'C', 'D', 'E'] }],
        },
        {
          ...makeValidCard(),
          quiz: [{ ...makeValidCard().quiz[0], answerIndex: 9 }],
        },
        {
          ...makeValidCard(),
          concepts: [{ term: '   ', definition: 'Valid' }],
        },
        makeValidCard(4, 8),
        makeValidCard(11, 8),
        makeValidCard(8, 4),
        makeValidCard(8, 11),
      ];

      for (const payload of badPayloads) {
        const res = await runWithGroqText(JSON.stringify(payload));
        assert.equal(res.status, 502, `expected 502 for payload ${JSON.stringify(payload).slice(0, 80)}`);
        assert.equal(res.body.error, 'invalid_ai_response');
        assert.equal(res.body.data, undefined);
      }
    });
  });

  describe('Upstream failures & timeouts (502 / 504 / 500)', () => {
    it('maps 401/403 authentication errors to 502 upstream_failure without leaking keys', async () => {
      const mockClient = makeMockGroqClient(async () => {
        throw new APIError(401, { message: 'Invalid API Key gsk_secret_123' }, 'Unauthorized', new Headers());
      });
      const app = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: mockClient }),
      });

      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 502);
        assert.equal(body.error, 'upstream_failure');
        assert.equal(JSON.stringify(body).includes('gsk_secret_123'), false);
      });
    });

    it('maps 429 rate-limit errors to 502 upstream_failure', async () => {
      const mockClient = makeMockGroqClient(async () => {
        throw new APIError(429, { message: 'Rate limit exceeded' }, 'Too Many Requests', new Headers());
      });
      const app = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: mockClient }),
      });

      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 502);
        assert.equal(body.error, 'upstream_failure');
      });
    });

    it('maps network errors to 502 upstream_failure', async () => {
      const mockClient = makeMockGroqClient(async () => {
        throw new Error('fetch failed: ECONNRESET');
      });
      const app = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: mockClient }),
      });

      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 502);
        assert.equal(body.error, 'upstream_failure');
      });
    });

    it('maps AbortController timeout and APIConnectionTimeoutError to 504 timeout', async () => {
      const slowClient = makeMockGroqClient((_params, { signal }) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const app1 = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: slowClient, timeoutMs: 40 }),
      });

      await withServer(app1, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 504);
        assert.equal(body.error, 'timeout');
      });

      const sdkTimeoutClient = makeMockGroqClient(async () => {
        throw new APIConnectionTimeoutError();
      });
      const app2 = createApp({
        generateCard: (topic, opts) => generateStudyCard(topic, { ...opts, client: sdkTimeoutClient }),
      });
      await withServer(app2, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 504);
        assert.equal(body.error, 'timeout');
      });
    });

    it('maps unexpected errors to 500 internal_error without leaking stack traces', async () => {
      const app = createApp({
        generateCard: async () => {
          throw new TypeError('Unexpected internal bug');
        },
      });

      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Operating Systems' }),
        });
        const body = await res.json();
        assert.equal(res.status, 500);
        assert.equal(body.error, 'internal_error');
        assert.equal(JSON.stringify(body).includes('Unexpected internal bug'), false);
      });
    });
  });
});

