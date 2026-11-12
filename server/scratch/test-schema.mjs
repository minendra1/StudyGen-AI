// scratch/test-schema.mjs  — schema unit tests (not a production file)
import { StudyCardSchema } from '../lib/cardSchema.js';

const validCard = {
  title: 'Operating Systems',
  summary: 'An OS manages hardware and software resources.',
  difficulty: 'intermediate',
  concepts: [{ term: 'Kernel', definition: 'Core of the OS.' }],
  flashcards: [{ front: 'What is a kernel?', back: 'Core of the OS.' }],
  quiz: [
    {
      question: 'What does an OS do?',
      options: ['Manages resources', 'Writes code', 'Renders graphics', 'Stores files'],
      answerIndex: 0,
      explanation: 'An OS primarily manages hardware and software resources.',
    },
  ],
};

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    process.exitCode = 1;
  }
}

console.log('\n── Zod Schema Tests ──────────────────────────────────────────');

// 1. Valid card passes
let r = StudyCardSchema.safeParse(validCard);
assert('Valid card passes', r.success);

// 2. Missing title rejected
r = StudyCardSchema.safeParse({ ...validCard, title: '' });
assert('Empty title rejected', !r.success);

// 3. Bad difficulty rejected
r = StudyCardSchema.safeParse({ ...validCard, difficulty: 'expert' });
assert('Bad difficulty rejected', !r.success);

// 4. Empty concepts array rejected
r = StudyCardSchema.safeParse({ ...validCard, concepts: [] });
assert('Empty concepts array rejected', !r.success);

// 5. Empty flashcards array rejected
r = StudyCardSchema.safeParse({ ...validCard, flashcards: [] });
assert('Empty flashcards array rejected', !r.success);

// 6. Quiz with 3 options (not 4) rejected
r = StudyCardSchema.safeParse({
  ...validCard,
  quiz: [{ ...validCard.quiz[0], options: ['A', 'B', 'C'] }],
});
assert('Quiz item with 3 options rejected', !r.success);

// 7. answerIndex out of range (4) rejected
r = StudyCardSchema.safeParse({
  ...validCard,
  quiz: [{ ...validCard.quiz[0], answerIndex: 4 }],
});
assert('answerIndex 4 rejected', !r.success);

// 8. answerIndex out of range (-1) rejected
r = StudyCardSchema.safeParse({
  ...validCard,
  quiz: [{ ...validCard.quiz[0], answerIndex: -1 }],
});
assert('answerIndex -1 rejected', !r.success);

// 9. Missing explanation rejected
r = StudyCardSchema.safeParse({
  ...validCard,
  quiz: [{ ...validCard.quiz[0], explanation: '' }],
});
assert('Empty explanation rejected', !r.success);

// 10. Extra unknown fields — Zod should still parse (strip by default)
r = StudyCardSchema.safeParse({ ...validCard, extraField: 'ignored' });
assert('Extra field parsed (stripped)', r.success);

// 11. Non-integer answerIndex rejected
r = StudyCardSchema.safeParse({
  ...validCard,
  quiz: [{ ...validCard.quiz[0], answerIndex: 1.5 }],
});
assert('Float answerIndex rejected', !r.success);

// 12. Empty quiz array rejected
r = StudyCardSchema.safeParse({ ...validCard, quiz: [] });
assert('Empty quiz array rejected', !r.success);

console.log('─────────────────────────────────────────────────────────────\n');

