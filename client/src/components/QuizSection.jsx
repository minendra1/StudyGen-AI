import { useState } from 'react';
import '../styles/Quiz.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizSection({ quiz }) {
  const initialQuestions = Array.isArray(quiz) ? quiz : [];

  const [questionsPool, setQuestionsPool] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isRetest, setIsRetest] = useState(false);

  if (questionsPool.length === 0) {
    return (
      <section className="card quiz-card" aria-labelledby="quiz-heading">
        <div className="section-header">
          <h3 id="quiz-heading" className="section-title">
            Practice Quiz
          </h3>
        </div>
        <p className="empty-section-text">No quiz questions were provided for this topic.</p>
      </section>
    );
  }

  const total = questionsPool.length;
  const currentQuestion = questionsPool[currentIndex];
  const hasAnswered = selectedOption !== null;
  const isCorrectSelection = hasAnswered && selectedOption === currentQuestion.answerIndex;
  const isLastQuestion = currentIndex + 1 >= total;

  function handleSelectOption(optionIndex) {
    // Prevent changing answer after submitting it.
    if (hasAnswered) return;

    setSelectedOption(optionIndex);
    if (optionIndex === currentQuestion.answerIndex) {
      setCorrectCount((count) => count + 1);
    } else {
      setMissedQuestions((prev) => [...prev, currentQuestion]);
    }
  }

  function handleNextQuestion() {
    if (!hasAnswered) return;

    if (isLastQuestion) {
      setIsComplete(true);
    } else {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOption(null);
    }
  }

  function handleRetestMissed() {
    if (missedQuestions.length === 0) return;
    setQuestionsPool(missedQuestions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setMissedQuestions([]);
    setIsComplete(false);
    setIsRetest(true);
  }

  if (isComplete) {
    const incorrectCount = missedQuestions.length;
    const percentage = Math.round((correctCount / total) * 100);

    return (
      <section className="card quiz-card" aria-labelledby="quiz-heading">
        <div className="section-header">
          <h3 id="quiz-heading" className="section-title">
            {isRetest ? 'Retest Complete' : 'Quiz Complete'}
          </h3>
        </div>

        <div className="quiz-summary" aria-live="polite">
          <div className="quiz-score-circle">
            <span className="quiz-score-value">{percentage}%</span>
            <span className="quiz-score-fraction">
              {correctCount} of {total}
            </span>
          </div>

          <div className="quiz-stats">
            <div className="quiz-stat quiz-stat--correct">
              <span className="quiz-stat-label">Correct</span>
              <span className="quiz-stat-num">{correctCount}</span>
            </div>
            <div className="quiz-stat quiz-stat--incorrect">
              <span className="quiz-stat-label">Incorrect</span>
              <span className="quiz-stat-num">{incorrectCount}</span>
            </div>
          </div>

          <p className="quiz-summary-message">
            {incorrectCount === 0
              ? 'Great job! You answered every question correctly.'
              : `You missed ${incorrectCount} ${incorrectCount === 1 ? 'question' : 'questions'}. Review and retest what you missed below.`}
          </p>

          {incorrectCount > 0 && (
            <div className="quiz-complete-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRetestMissed}
              >
                Retest Missed Questions ({incorrectCount})
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="card quiz-card" aria-labelledby="quiz-heading">
      <div className="section-header">
        <div className="quiz-title-group">
          <h3 id="quiz-heading" className="section-title">
            Practice Quiz
          </h3>
          {isRetest && <span className="quiz-retest-pill">Retest Mode</span>}
        </div>
        <div className="quiz-meta-right">
          <span className="quiz-score-live" aria-label={`Current score: ${correctCount} correct`}>
            Score: {correctCount}
          </span>
          <span className="quiz-progress">
            Question {currentIndex + 1} of {total}
          </span>
        </div>
      </div>

      <div className="quiz-question-block">
        <p className="quiz-question-text">{currentQuestion.question}</p>

        <div className="quiz-options" role="group" aria-label="Answer options">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectOption = index === currentQuestion.answerIndex;

            let stateClass = '';
            if (hasAnswered) {
              if (isCorrectOption) {
                stateClass = 'quiz-option--correct';
              } else if (isSelected) {
                stateClass = 'quiz-option--incorrect';
              } else {
                stateClass = 'quiz-option--dimmed';
              }
            }

            return (
              <button
                key={`${currentIndex}-${index}`}
                type="button"
                className={`quiz-option ${stateClass}`}
                onClick={() => handleSelectOption(index)}
                disabled={hasAnswered}
                aria-pressed={isSelected}
              >
                <span className="quiz-option-letter" aria-hidden="true">
                  {OPTION_LETTERS[index] || index + 1}
                </span>
                <span className="quiz-option-text">{option}</span>
                {hasAnswered && isCorrectOption && (
                  <span className="quiz-option-tag quiz-option-tag--correct">Correct</span>
                )}
                {hasAnswered && isSelected && !isCorrectOption && (
                  <span className="quiz-option-tag quiz-option-tag--incorrect">Your pick</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {hasAnswered && (
        <div
          className={`quiz-feedback ${isCorrectSelection ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'}`}
          role="status"
          aria-live="polite"
        >
          <p className="quiz-feedback-heading">
            {isCorrectSelection
              ? 'Correct!'
              : `Incorrect — Option ${OPTION_LETTERS[currentQuestion.answerIndex]} is correct.`}
          </p>
          <p className="quiz-explanation">{currentQuestion.explanation}</p>

          <div className="quiz-next-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextQuestion}
            >
              {isLastQuestion ? 'View Results' : 'Next Question'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

