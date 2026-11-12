import '../styles/StudyCard.css';

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function StudyOverview({ title, summary, difficulty }) {
  const normalizedDifficulty = DIFFICULTY_LABELS[difficulty] ? difficulty : 'beginner';
  const difficultyLabel = DIFFICULTY_LABELS[normalizedDifficulty];

  return (
    <section className="card overview-card" aria-labelledby="study-overview-title">
      <div className="overview-header">
        <h2 id="study-overview-title" className="overview-title">
          {title}
        </h2>
        <span
          className={`difficulty-badge difficulty-badge--${normalizedDifficulty}`}
          aria-label={`Difficulty: ${difficultyLabel}`}
        >
          {difficultyLabel}
        </span>
      </div>
      <p className="overview-summary">{summary}</p>
    </section>
  );
}

