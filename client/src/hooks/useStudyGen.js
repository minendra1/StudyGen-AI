import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_STATE = {
  status: 'idle',
  data: null,
  error: null,
};

/**
 * Defensive runtime validation on the client to ensure we never render
 * partially received or structurally invalid study data.
 */
export function isValidStudyData(payload) {
  if (!payload || typeof payload !== 'object') return false;

  const { title, summary, difficulty, concepts, flashcards, quiz } = payload;

  if (typeof title !== 'string' || !title.trim()) return false;
  if (typeof summary !== 'string' || !summary.trim()) return false;
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) return false;

  if (!Array.isArray(concepts) || concepts.length === 0) return false;
  const validConcepts = concepts.every(
    (c) => c && typeof c.term === 'string' && c.term.trim() && typeof c.definition === 'string' && c.definition.trim(),
  );
  if (!validConcepts) return false;

  if (!Array.isArray(flashcards) || flashcards.length < 5 || flashcards.length > 10) return false;
  const validFlashcards = flashcards.every(
    (f) => f && typeof f.front === 'string' && f.front.trim() && typeof f.back === 'string' && f.back.trim(),
  );
  if (!validFlashcards) return false;

  if (!Array.isArray(quiz) || quiz.length < 5 || quiz.length > 10) return false;
  const validQuiz = quiz.every(
    (q) =>
      q &&
      typeof q.question === 'string' &&
      q.question.trim() &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((opt) => typeof opt === 'string' && opt.trim()) &&
      Number.isInteger(q.answerIndex) &&
      q.answerIndex >= 0 &&
      q.answerIndex <= 3 &&
      typeof q.explanation === 'string' &&
      q.explanation.trim(),
  );

  return validQuiz;
}

/**
 * Custom hook managing the StudyGen AI generation lifecycle,
 * request cancellation via AbortController, and stale-response prevention.
 */
export function useStudyGen() {
  const [state, setState] = useState(INITIAL_STATE);
  const [generationId, setGenerationId] = useState(0);

  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastTopicRef = useRef('');

  // Abort any in-flight request when the component unmounts.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async (rawTopic) => {
    const topic = typeof rawTopic === 'string' ? rawTopic.trim() : '';
    if (!topic) {
      setState({
        status: 'error',
        data: null,
        error: 'Please enter a topic or study notes before generating.',
      });
      return;
    }

    lastTopicRef.current = rawTopic;

    // Cancel any previous in-flight request.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Increment request counter to guard against out-of-order responses.
    const currentRequestId = ++requestIdRef.current;

    setState({
      status: 'loading',
      data: null,
      error: null,
    });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: controller.signal,
      });

      // Ignore if a newer request has already been initiated.
      if (currentRequestId !== requestIdRef.current) return;

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        // Non-JSON response (e.g. proxy error when backend is unreachable).
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

      if (!response.ok) {
        const serverMessage =
          typeof payload?.message === 'string' && payload.message.trim()
            ? payload.message
            : `Request failed with status ${response.status}. Please try again.`;

        setState({
          status: 'error',
          data: null,
          error: serverMessage,
        });
        return;
      }

      if (!isValidStudyData(payload?.data)) {
        setState({
          status: 'error',
          data: null,
          error: 'Received incomplete or invalid study material. Please retry.',
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
      // Aborted requests must never overwrite state or show an error.
      if (err?.name === 'AbortError' || currentRequestId !== requestIdRef.current) {
        return;
      }

      setState({
        status: 'error',
        data: null,
        error: 'Network error while contacting the server. Check your connection and try again.',
      });
    }
  }, []);

  const retry = useCallback(() => {
    if (lastTopicRef.current && lastTopicRef.current.trim().length > 0) {
      generate(lastTopicRef.current);
    }
  }, [generate]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    requestIdRef.current += 1;
    setState(INITIAL_STATE);
  }, []);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    generationId,
    canRetry: Boolean(lastTopicRef.current && lastTopicRef.current.trim().length > 0),
    generate,
    retry,
    reset,
  };
}

