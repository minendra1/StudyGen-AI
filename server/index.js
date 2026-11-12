// server/index.js
import 'dotenv/config';
import express from 'express';
import generateRouter from './routes/generate.js';
import { AppError } from './lib/errors.js';

// ── Environment validation ────────────────────────────────────────────────────
// Fail fast — if the key is absent the whole backend is non-functional.
if (!process.env.GROQ_API_KEY) {
  console.error(
    '[startup] GROQ_API_KEY is not set.\n' +
    '  1. Copy server/.env.example to server/.env\n' +
    '  2. Replace the placeholder with your real key from https://console.groq.com\n' +
    '  3. Restart the server.',
  );
  process.exit(1);
}

const app = express();
const PORT = 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'StudyGen AI backend is running' });
});

app.use('/api/generate', generateRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must be registered last and have exactly 4 parameters.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Known application errors — send structured response.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }

  // Unknown errors — log internally, send generic message.
  console.error('[server] unexpected error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected server error occurred.',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StudyGen AI backend running on http://localhost:${PORT}`);
});
