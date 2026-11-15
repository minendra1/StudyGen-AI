
import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_STATE = {
  status: 'idle',
  data: null,
  error: null,
};

// Uses the Render backend in production.
// Falls back to the Vite proxy during local development.
const rawApiUrl = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

/**
 * Validate the generated study material before rendering.
 */
export function isValidStudyData(payload) {
  if (!payload || typeof payload !== 'object') return false;

  const { title, summary, difficulty, concepts, flashcards, quiz } = payload;

  if (typeof title !== 'string' || !title.trim()) return false;
  if (typeof summary !== 'string' || !summary.trim()) return false;

  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return false;
  }

  if (!Array.isArray(concepts) || concepts.length === 0) {
    return false;
  }

  const validConcepts = concepts.every(
    (c) =>
      c &&
      typeof c.term === 'string' &&
      c.term.trim() &&
      typeof c.definition === 'string' &&
      c.definition.trim()
  );

  if (!validConcepts) return false;

  if (
    !Array.isArray(flashcards) ||
    flashcards.length < 5 ||
    flashcards.length > 10
  ) {
    return false;
  }

  const validFlashcards = flashcards.every(
    (f) =>
      f &&
      typeof f.front === 'string' &&
      f.front.trim() &&
      typeof f.back === 'string' &&
      f.back.trim()
  );

  if (!validFlashcards) return false;

  if (!Array.isArray(quiz) || quiz.length < 5 || quiz.length > 10) {
    return false;
  }

  const validQuiz = quiz.every(
    (q) =>
      q &&
      typeof q.question === 'string' &&
      q.question.trim() &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every(
        (opt) => typeof opt === 'string' && opt.trim()
      ) &&
      Number.isInteger(q.answerIndex) &&
      q.answerIndex >= 0 &&
      q.answerIndex <= 3 &&
      typeof q.explanation === 'string' &&
      q.explanation.trim()
  );

  return validQuiz;
}

/**
 * Custom hook managing study generation, API communication,
 * request cancellation, validation, and error handling.
 */
export function useStudyGen() {
  const [state, setState] = useState(INITIAL_STATE);
  const [generationId, setGenerationId] = useState(0);

  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastTopicRef = useRef('');

  // Abort requests when the component unmounts.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async (rawTopic) => {
    const topic =
      typeof rawTopic === 'string' ? rawTopic.trim() : '';

    if (!topic) {
      controllerRef.current?.abort();
      requestIdRef.current += 1;

      setState({
        status: 'error',
        data: null,
        error: 'Please enter a topic or study notes before generating.',
      });

      return;
    }

    lastTopicRef.current = topic;

    // Cancel any previous request.
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    const currentRequestId = ++requestIdRef.current;

    setState({
      status: 'loading',
      data: null,
      error: null,
    });

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
        signal: controller.signal,
      });

      // Ignore outdated responses.
      if (currentRequestId !== requestIdRef.current) return;

      let payload = null;

      try {
        payload = await response.json();
      } catch {
        if (currentRequestId !== requestIdRef.current) return;

        setState({
          status: 'error',
          data: null,
          error: response.ok
            ? 'Received an invalid response from the server. Please try again.'
            : `Server error (${response.status}). Please verify the backend is running and try again.`,
        });

        return;
      }

      if (currentRequestId !== requestIdRef.current) return;

      // Handle HTTP errors.
      if (!response.ok) {
        const serverMessage =
          typeof payload?.message === 'string' &&
            payload.message.trim()
            ? payload.message
            : `Request failed with status ${response.status}. Please try again.`;

        setState({
          status: 'error',
          data: null,
          error: serverMessage,
        });

        return;
      }

      // Validate response before rendering.
      if (!isValidStudyData(payload?.data)) {
        setState({
          status: 'error',
          data: null,
          error:
            'Received incomplete or invalid study material. Please retry.',
        });

        return;
      }

      setGenerationId((id) => id + 1);

      setState({
        status: 'success',
        data: payload.data,
        error: null,
      });
    } catch (err) {
      if (
        err?.name === 'AbortError' ||
        currentRequestId !== requestIdRef.current
      ) {
        return;
      }

      setState({
        status: 'error',
        data: null,
        error:
          'Network error while contacting the server. Check your connection and try again.',
      });
    }
  }, []);

  // Retry the previous generation.
  const retry = useCallback(() => {
    if (lastTopicRef.current) {
      generate(lastTopicRef.current);
    }
  }, [generate]);

  // Reset the current study session.
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    requestIdRef.current += 1;

    lastTopicRef.current = '';

    setState(INITIAL_STATE);
  }, []);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    generationId,
    canRetry: Boolean(lastTopicRef.current),
    generate,
    retry,
    reset,
  };
}
