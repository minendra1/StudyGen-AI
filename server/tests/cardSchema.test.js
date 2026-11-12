import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StudyCardSchema } from '../lib/cardSchema.js';

function makeFlashcards(count) {
  return Array.from({ length: count }, (_, i) => ({
    front: `Flashcard question ${i + 1}?`,
    back: `Flashcard answer ${i + 1}.`,
  }));
}

function makeQuiz(count) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Quiz question ${i + 1}?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    answerIndex: i % 4,
    explanation: `Explanation for question ${i + 1}.`,
  }));
}

function makeValidCard(flashcardCount = 8, quizCount = 8) {
  return {
    title: 'Operating Systems',
    summary: 'An OS manages hardware and software resources.',
    difficulty: 'intermediate',
    concepts: [{ term: 'Kernel', definition: 'Core of the OS.' }],
    flashcards: makeFlashcards(flashcardCount),
    quiz: makeQuiz(quizCount),
  };
}

describe('StudyCardSchema', () => {
  it('accepts a valid study card and trims text fields', () => {
    const card = makeValidCard();
    card.title = '  Operating Systems  ';
    card.concepts[0].term = '  Kernel ';
    const result = StudyCardSchema.safeParse(card);
    assert.equal(result.success, true);
    assert.equal(result.data.title, 'Operating Systems');
    assert.equal(result.data.concepts[0].term, 'Kernel');
  });

  it('enforces flashcard count boundaries (4 rejected; 5, 8, 10 accepted; 11 rejected)', () => {
    assert.equal(StudyCardSchema.safeParse(makeValidCard(4, 5)).success, false);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(5, 5)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(8, 8)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(10, 5)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(11, 5)).success, false);
  });

  it('enforces quiz count boundaries (4 rejected; 5, 8, 10 accepted; 11 rejected)', () => {
    assert.equal(StudyCardSchema.safeParse(makeValidCard(5, 4)).success, false);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(5, 5)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(8, 8)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(5, 10)).success, true);
    assert.equal(StudyCardSchema.safeParse(makeValidCard(5, 11)).success, false);
  });

  it('rejects missing required fields', () => {
    for (const field of ['title', 'summary', 'difficulty', 'concepts', 'flashcards', 'quiz']) {
      const card = makeValidCard();
      delete card[field];
      assert.equal(StudyCardSchema.safeParse(card).success, false, `expected ${field} to be required`);
    }
  });

  it('rejects empty and whitespace-only strings in required fields', () => {
    for (const val of ['', '   ', '\t\n']) {
      const c1 = makeValidCard();
      c1.title = val;
      assert.equal(StudyCardSchema.safeParse(c1).success, false);

      const c2 = makeValidCard();
      c2.summary = val;
      assert.equal(StudyCardSchema.safeParse(c2).success, false);

      const c3 = makeValidCard();
      c3.concepts[0].term = val;
      assert.equal(StudyCardSchema.safeParse(c3).success, false);

      const c4 = makeValidCard();
      c4.flashcards[0].back = val;
      assert.equal(StudyCardSchema.safeParse(c4).success, false);

      const c5 = makeValidCard();
      c5.quiz[0].options[2] = val;
      assert.equal(StudyCardSchema.safeParse(c5).success, false);

      const c6 = makeValidCard();
      c6.quiz[0].explanation = val;
      assert.equal(StudyCardSchema.safeParse(c6).success, false);
    }
  });

  it('rejects invalid difficulty values', () => {
    const card = makeValidCard();
    card.difficulty = 'expert';
    assert.equal(StudyCardSchema.safeParse(card).success, false);
  });

  it('rejects empty concepts, flashcards, and quiz arrays', () => {
    for (const field of ['concepts', 'flashcards', 'quiz']) {
      const card = makeValidCard();
      card[field] = [];
      assert.equal(StudyCardSchema.safeParse(card).success, false, `expected empty ${field} to fail`);
    }
  });

  it('rejects quiz items with fewer or more than 4 options', () => {
    const fewer = makeValidCard();
    fewer.quiz[0].options = ['A', 'B', 'C'];
    assert.equal(StudyCardSchema.safeParse(fewer).success, false);

    const more = makeValidCard();
    more.quiz[0].options = ['A', 'B', 'C', 'D', 'E'];
    assert.equal(StudyCardSchema.safeParse(more).success, false);
  });

  it('rejects invalid answerIndex values', () => {
    for (const bad of [-1, 4, 1.5, '0', null]) {
      const card = makeValidCard();
      card.quiz[0].answerIndex = bad;
      assert.equal(StudyCardSchema.safeParse(card).success, false, `expected answerIndex=${bad} to fail`);
    }
  });
});
