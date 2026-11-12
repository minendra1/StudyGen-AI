import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'StudyGen AI backend is running',
  });
});

// ── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected server error occurred',
  });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StudyGen AI backend running on http://localhost:${PORT}`);
});

