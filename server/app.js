
import express from 'express';
import cors from 'cors';
import { createGenerateRouter } from './routes/generate.js';
import { AppError, ErrorCode } from './lib/errors.js';

export function createApp({ generateCard } = {}) {
  const app = express();

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'https://study-gen-ai-sage.vercel.app',
    process.env.CLIENT_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server health checks, curl, mobile)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/study-gen-ai[a-z0-9-]*\.vercel\.app$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'StudyGen AI backend is running'
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'StudyGen AI backend is running'
    });
  });

  app.use('/api/generate', createGenerateRouter({ generateCard }));

  app.use((_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'Route not found'
    });
  });

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(422).json({
        error: ErrorCode.INVALID_INPUT,
        message: 'Request body must be valid JSON.'
      });
    }

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.code,
        message: err.message
      });
    }

    console.error('[server] unexpected error:', err);

    return res.status(500).json({
      error: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected server error occurred.'
    });
  });

  return app;
}
