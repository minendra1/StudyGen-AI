
import 'dotenv/config';
import { createApp } from './app.js';

// Validate environment variables
if (!process.env.GROQ_API_KEY?.trim()) {
  console.error(
    '[startup] GROQ_API_KEY is not set.\n' +
    '  1. Copy server/.env.example to server/.env\n' +
    '  2. Add your actual Groq API key.\n' +
    '  3. Restart the server.'
  );
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyGen AI backend running on port ${PORT}`);
});
