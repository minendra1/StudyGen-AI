import { useState } from 'react';
import '../styles/Flashcards.css';

export default function Flashcards({ flashcards }) {
  const cards = Array.isArray(flashcards) ? flashcards : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <section className="card flashcards-card" aria-labelledby="flashcards-heading">
        <div className="section-header">
          <h3 id="flashcards-heading" className="section-title">
            Flashcards
          </h3>
        </div>
        <p className="empty-section-text">No flashcards were provided for this topic.</p>
      </section>
    );
  }

  const total = cards.length;
  const safeIndex = currentIndex < total ? currentIndex : 0;
  const currentCard = cards[safeIndex];
  const progressPercent = Math.round(((safeIndex + 1) / total) * 100);

  function handleFlip() {
    setIsFlipped((prev) => !prev);
  }

  function handlePrev() {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }

  function handleNext() {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  }

  return (
    <section className="card flashcards-card" aria-labelledby="flashcards-heading">
      <div className="section-header">
        <h3 id="flashcards-heading" className="section-title">
          Flashcards
        </h3>
        <span className="flashcard-progress" aria-live="polite">
          Card {safeIndex + 1} of {total}
        </span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="Flashcard progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={safeIndex + 1}
      >
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="flashcard-scene">
        <button
          type="button"
          className={`flashcard-btn ${isFlipped ? 'is-flipped' : ''}`}
          onClick={handleFlip}
          aria-pressed={isFlipped}
          aria-label={
            isFlipped
              ? `Flashcard ${safeIndex + 1} back: ${currentCard.back}. Activate to flip to front.`
              : `Flashcard ${safeIndex + 1} front: ${currentCard.front}. Activate to flip to back.`
          }
        >
          <span className="flashcard-face flashcard-face--front">
            <span className="flashcard-side-label">Front · Question / Term</span>
            <span className="flashcard-content">{currentCard.front}</span>
            <span className="flashcard-tap-hint">Click or press Enter to reveal answer</span>
          </span>

          <span className="flashcard-face flashcard-face--back">
            <span className="flashcard-side-label">Back · Answer</span>
            <span className="flashcard-content">{currentCard.back}</span>
            <span className="flashcard-tap-hint">Click or press Enter to show front</span>
          </span>
        </button>
      </div>

      <div className="flashcard-controls">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePrev}
          aria-label="Previous flashcard"
        >
          ← Previous
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleFlip}
        >
          {isFlipped ? 'Show Front' : 'Flip Card'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleNext}
          aria-label="Next flashcard"
        >
          Next →
        </button>
      </div>
    </section>
  );
}
