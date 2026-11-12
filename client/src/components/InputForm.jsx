import { useState } from 'react';
import '../styles/InputForm.css';

const MAX_LENGTH = 5000;
const WARNING_THRESHOLD = 4500;

export default function InputForm({ onSubmit, isLoading }) {
  const [topic, setTopic] = useState('');
  const [touched, setTouched] = useState(false);

  const length = topic.length;
  const trimmedLength = topic.trim().length;
  const isTooLong = length > MAX_LENGTH;
  const isEmpty = trimmedLength === 0;
  const isNearLimit = length >= WARNING_THRESHOLD && !isTooLong;
  const isValid = !isEmpty && !isTooLong;

  let validationMessage = null;
  let validationType = null;

  if (isTooLong) {
    const excess = length - MAX_LENGTH;
    validationMessage = `Input exceeds the ${MAX_LENGTH.toLocaleString()} character maximum by ${excess.toLocaleString()} ${excess === 1 ? 'character' : 'characters'}.`;
    validationType = 'error';
  } else if (touched && isEmpty) {
    validationMessage = 'Please enter at least one non-whitespace character.';
    validationType = 'error';
  } else if (isNearLimit) {
    const remaining = MAX_LENGTH - length;
    validationMessage = `Approaching character limit: ${remaining.toLocaleString()} ${remaining === 1 ? 'character' : 'characters'} remaining.`;
    validationType = 'warning';
  }

  function handleChange(e) {
    setTopic(e.target.value);
    if (!touched) setTouched(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || isLoading) return;
    onSubmit(topic);
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (isValid && !isLoading) {
        e.preventDefault();
        onSubmit(topic);
      }
    }
  }

  const counterClass = isTooLong
    ? 'input-counter input-counter--error'
    : isNearLimit
      ? 'input-counter input-counter--warning'
      : 'input-counter';

  return (
    <section className="card input-card" aria-labelledby="topic-form-heading">
      <h2 id="topic-form-heading" className="sr-only">
        Study Topic Input
      </h2>
      <form className="input-form" onSubmit={handleSubmit} noValidate>
        <div className="input-header">
          <label htmlFor="topic-input" className="input-label">
            Topic or Study Notes
          </label>
          <span className="input-hint">Press Ctrl+Enter to generate</span>
        </div>

        <textarea
          id="topic-input"
          className={`input-textarea ${validationType === 'error' ? 'input-textarea--error' : ''}`}
          value={topic}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a topic, concept, or paste your notes..."
          rows={5}
          aria-invalid={validationType === 'error'}
          aria-describedby="topic-counter topic-validation"
        />

        <div className="input-meta">
          <div id="topic-validation" className="input-validation" aria-live="polite">
            {validationMessage && (
              <p className={`validation-msg validation-msg--${validationType}`} role={validationType === 'error' ? 'alert' : undefined}>
                {validationMessage}
              </p>
            )}
          </div>
          <span id="topic-counter" className={counterClass} aria-live="polite">
            {length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters
          </span>
        </div>

        <div className="input-actions">
          <button
            type="submit"
            className="btn btn-primary generate-btn"
            disabled={!isValid || isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Study Material'}
          </button>
        </div>
      </form>
    </section>
  );
}

