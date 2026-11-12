import { useStudyGen } from './hooks/useStudyGen.js';
import { useTheme } from './hooks/useTheme.js';
import InputForm from './components/InputForm.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import StudyOverview from './components/StudyOverview.jsx';
import ConceptsList from './components/ConceptsList.jsx';
import Flashcards from './components/Flashcards.jsx';
import QuizSection from './components/QuizSection.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default function App() {
  const { status, data, error, generationId, canRetry, generate, retry, reset } = useStudyGen();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-top">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                SG
              </span>
              <h1 className="brand-title">StudyGen AI</h1>
            </div>

            <button
              type="button"
              className="btn btn-secondary theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <MoonIcon /> : <SunIcon />}
              <span className="theme-toggle-label">{isDark ? 'Dark' : 'Light'}</span>
            </button>
          </div>

          <p className="brand-subtitle">
            Turn any topic or set of notes into an organized summary, key concepts, interactive
            flashcards, and a practice quiz.
          </p>
        </div>
      </header>

      <main className="app-main">
        <InputForm onSubmit={generate} isLoading={status === 'loading'} />

        <ErrorBoundary onReset={reset}>
          {status === 'success' && data ? (
            <div className="dashboard" aria-label="Generated study material">
              <StudyOverview
                title={data.title}
                summary={data.summary}
                difficulty={data.difficulty}
              />

              <ConceptsList concepts={data.concepts} />

              <div className="dashboard-interactive-grid">
                <Flashcards key={`flashcards-${generationId}`} flashcards={data.flashcards} />
                <QuizSection key={`quiz-${generationId}`} quiz={data.quiz} />
              </div>
            </div>
          ) : (
            <StatusMessage
              status={status}
              error={error}
              canRetry={canRetry}
              onRetry={retry}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
