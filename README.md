# StudyGen AI

An AI-powered study tool that generates structured study cards — including summaries, key concepts, flashcards, and quizzes — from free-form topic input.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| AI | Groq SDK (`openai/gpt-oss-20b`) |
| Validation | Zod |

## Setup

### Prerequisites
- Node.js ≥ 18
- A [Groq API key](https://console.groq.com)

### 1. Clone the repository
```bash
git clone <repo-url>
cd studygen-ai
```

### 2. Configure environment
```bash
cp .env.example server/.env
# Edit server/.env and set GROQ_API_KEY=<your-key>
```

### 3. Install all dependencies
```bash
npm install
```

### 4. Start both servers
```bash
npm start
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## AI Usage

The app sends user-provided topic text to the Groq API using the `openai/gpt-oss-20b` model with strict JSON Schema structured output enabled. The model returns a study card object containing a title, summary, difficulty rating, key concepts, flashcards, and a multiple-choice quiz. All responses are validated with Zod before being sent to the client.

## Known Limitations

- Requires a valid Groq API key; the app does not function without one.
- Study card quality depends on the topic input quality.
- No persistent storage — results are lost on page refresh.
- Groq API rate limits may cause occasional failures under heavy use.

## Project Structure

```
StudyGen AI/
├── client/          # React + Vite frontend (port 5173)
├── server/          # Node.js + Express backend (port 3001)
├── .env.example     # Environment variable template
└── package.json     # Root scripts (npm install / npm start)
```

## Time Spent

| Phase | Description | Time |
|---|---|---|
| Phase 1 | Scaffold & plumbing | — |
| Phase 2 | Backend core (Groq + Zod) | — |
| Phase 3 | Frontend hook & states | — |
| Phase 4 | UI rendering | — |
| Phase 5 | Edge cases & polish | — |

*(Updated as phases complete)*

