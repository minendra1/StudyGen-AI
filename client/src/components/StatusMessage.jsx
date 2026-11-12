import '../styles/StatusMessage.css';

export default function StatusMessage({ status, error, canRetry, onRetry }) {
  if (status === 'idle') {
    return (
      <section className="card status-card status-card--idle" aria-label="Getting started">
        <div className="status-icon status-icon--idle" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h8" />
            <path d="M8 11h6" />
          </svg>
        </div>
        <h2 className="status-title">Ready to build your study session</h2>
        <p className="status-description">
          Enter any topic, concept, or lecture notes above and select{' '}
          <strong>Generate Study Material</strong> to create a structured overview, key concepts,
          interactive flashcards, and a multiple-choice quiz.
        </p>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section className="card status-card status-card--loading" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <h2 className="status-title">Generating your study material...</h2>
        <p className="status-description">
          Organizing key concepts, crafting flashcards, and building quiz questions for your topic.
        </p>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="card status-card status-card--error" role="alert">
        <div className="status-icon status-icon--error" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="status-title">Could not generate study material</h2>
        <p className="status-description">{error || 'An unexpected error occurred. Please try again.'}</p>
        {canRetry && typeof onRetry === 'function' && (
          <div className="status-actions">
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </section>
    );
  }

  return null;
}

