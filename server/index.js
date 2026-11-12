// server/index.js
import 'dotenv/config';
import { createApp } from './app.js';

// ── Environment validation ────────────────────────────────────────────────────
// Fail fast — if the key is absent the whole backend is non-functional.
if (!process.env.GROQ_API_KEY?.trim()) {
  console.error(
    '[startup] GROQ_API_KEY is not set.\n' +
    '  1. Copy server/.env.example to server/.env\n' +
    '  2. Replace the placeholder with your real key from https://console.groq.com\n' +
    '  3. Restart the server.',
  );
  process.exit(1);
}

const PORT = 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`StudyGen AI backend running on http://localhost:${PORT}`);
});
