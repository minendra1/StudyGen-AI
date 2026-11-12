import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidStudyData } from '../src/hooks/useStudyGen.js';

function makeValidCard(flashcardCount = 8, quizCount = 8) {
  return {
    title: 'Binary Trees',
    summary: 'Hierarchical data structures with at most two children per node.',
    difficulty: 'beginner',
    concepts: [{ term: 'Root', definition: 'The topmost node in a tree.' }],
    flashcards: Array.from({ length: flashcardCount }, (_, i) => ({
      front: `Card ${i + 1} front`,
      back: `Card ${i + 1} back`,
    })),
    quiz: Array.from({ length: quizCount }, (_, i) => ({
      question: `Question ${i + 1}?`,
      options: ['1', '2', '3', '4'],
      answerIndex: 1,
      explanation: `Explanation ${i + 1}.`,
    })),
  };
}

describe('Client-side study data validation (isValidStudyData)', () => {
  it('accepts a complete, valid study card with 5–10 flashcards and quiz items', () => {
    assert.equal(isValidStudyData(makeValidCard(5, 5)), true);
    assert.equal(isValidStudyData(makeValidCard(8, 8)), true);
    assert.equal(isValidStudyData(makeValidCard(10, 10)), true);
  });

  it('rejects flashcard or quiz counts outside 5–10', () => {
    assert.equal(isValidStudyData(makeValidCard(4, 5)), false);
    assert.equal(isValidStudyData(makeValidCard(11, 5)), false);
    assert.equal(isValidStudyData(makeValidCard(5, 4)), false);
    assert.equal(isValidStudyData(makeValidCard(5, 11)), false);
  });

  it('rejects null, non-objects, and incomplete objects', () => {
    assert.equal(isValidStudyData(null), false);
    assert.equal(isValidStudyData('string'), false);
    assert.equal(isValidStudyData({ title: 'Only title' }), false);
  });

  it('rejects whitespace-only text fields and invalid difficulty', () => {
    const c1 = makeValidCard();
    c1.title = '   ';
    assert.equal(isValidStudyData(c1), false);

    const c2 = makeValidCard();
    c2.difficulty = 'expert';
    assert.equal(isValidStudyData(c2), false);

    const c3 = makeValidCard();
    c3.quiz[0].options[1] = '  ';
    assert.equal(isValidStudyData(c3), false);
  });

  it('rejects empty concepts and invalid quiz options or answerIndex', () => {
    const emptyConcepts = makeValidCard();
    emptyConcepts.concepts = [];
    assert.equal(isValidStudyData(emptyConcepts), false);

    const badOptions = makeValidCard();
    badOptions.quiz[0].options = ['A', 'B', 'C'];
    assert.equal(isValidStudyData(badOptions), false);

    const badIndex = makeValidCard();
    badIndex.quiz[0].answerIndex = 4;
    assert.equal(isValidStudyData(badIndex), false);
  });
});
