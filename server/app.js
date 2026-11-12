// server/app.js
import express from 'express';
import { createGenerateRouter } from './routes/generate.js';
import { AppError, ErrorCode } from './lib/errors.js';

export function createApp({ generateCard } = {}) {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'StudyGen AI backend is running' });
  });

  app.use('/api/generate', createGenerateRouter({ generateCard }));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // Handle malformed JSON request bodies cleanly
    if (err?.type === 'entity.parse.failed') {
      return res.status(422).json({
        error: ErrorCode.INVALID_INPUT,
        message: 'Request body must be valid JSON.',
      });
    }

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }

    console.error('[server] unexpected error:', err);
    return res.status(500).json({
      error: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected server error occurred.',
    });
  });

  return app;
}

