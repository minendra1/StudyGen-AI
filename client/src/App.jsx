import { useStudyGen } from './hooks/useStudyGen.js';
import InputForm from './components/InputForm.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import StudyOverview from './components/StudyOverview.jsx';
import ConceptsList from './components/ConceptsList.jsx';
import Flashcards from './components/Flashcards.jsx';
import QuizSection from './components/QuizSection.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const { status, data, error, generationId, canRetry, generate, retry, reset } = useStudyGen();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              SG
            </span>
            <h1 className="brand-title">StudyGen AI</h1>
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
