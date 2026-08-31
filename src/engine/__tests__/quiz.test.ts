import { describe, expect, it } from 'vitest';
import { tests } from '../../data/quizzes';
import { scoreAnswers, selectQuestions, shuffle } from '../scoring';
import type { TestDefinition } from '../../types';

const allTests = Object.values(tests);

const scoringFixture: TestDefinition = {
  id: 'chakra',
  label: 'Test',
  shortLabel: 'T',
  icon: 'T',
  description: '',
  questionCount: 2,
  outcomes: {
    Fire: { id: 'Fire', label: 'Fire', symbol: 'F', description: '' },
    Wind: { id: 'Wind', label: 'Wind', symbol: 'W', description: '' },
  },
  questions: [
    { id: '1', theme: 'A', prompt: 'A', answers: [{ text: 'Fire', scores: { Fire: 5 } }, { text: 'Wind', scores: { Wind: 5 } }] },
    { id: '2', theme: 'B', prompt: 'B', answers: [{ text: 'Fire', scores: { Fire: 5 } }, { text: 'Wind', scores: { Wind: 5 } }] },
  ],
};

describe('quiz data contract', () => {
  it('has unique question ids and non-empty prompts', () => {
    for (const test of allTests) {
      const ids = test.questions.map((question) => question.id);
      expect(new Set(ids).size, `${test.id} contains duplicate question ids`).toBe(ids.length);
      for (const question of test.questions) {
        expect(question.prompt.trim().length, `${test.id}/${question.id} has an empty prompt`).toBeGreaterThan(0);
      }
    }
  });

  it('renders exactly four distinct answers for every question', () => {
    for (const test of allTests) {
      for (const question of test.questions) {
        expect(question.answers, `${test.id}/${question.id}`).toHaveLength(4);
        const labels = question.answers.map((answer) => answer.text.trim().toLowerCase());
        expect(new Set(labels).size, `${test.id}/${question.id} repeats an answer`).toBe(4);
      }
    }
  });

  it('only scores outcomes that exist in that test', () => {
    for (const test of allTests) {
      const validOutcomes = new Set(Object.keys(test.outcomes));
      for (const question of test.questions) {
        for (const answer of question.answers) {
          expect(Object.keys(answer.scores).length, `${test.id}/${question.id} answer has no score mapping`).toBeGreaterThan(0);
          for (const outcomeId of Object.keys(answer.scores)) {
            expect(validOutcomes.has(outcomeId), `${test.id}/${question.id} maps to unknown outcome ${outcomeId}`).toBe(true);
          }
        }
      }
    }
  });

  it('keeps configured lengths inside available question banks', () => {
    for (const test of allTests) {
      if (!test.lengths) continue;
      expect(test.lengths.short).toBeLessThanOrEqual(test.questions.length);
      expect(test.lengths.medium).toBeLessThanOrEqual(test.questions.length);
      expect(test.lengths.long).toBeLessThanOrEqual(test.questions.length);
      expect(test.lengths.short).toBeLessThanOrEqual(test.lengths.medium);
      expect(test.lengths.medium).toBeLessThanOrEqual(test.lengths.long);
    }
  });

  it('allows Rank Potential to reach Kage and Legendary outcomes', () => {
    const rank = tests.rank;
    expect(rank.outcomes.kagePotential?.label).toBe('Kage Potential');
    expect(rank.outcomes.legendary?.label).toBe('Legendary Potential');
    expect(rank.questions.filter((q) => q.answers.some((a) => (a.scores.kagePotential || 0) > 0))).toHaveLength(rank.questions.length);
    expect(rank.questions.filter((q) => q.answers.some((a) => (a.scores.legendary || 0) > 0))).toHaveLength(rank.questions.length);
  });
});

describe('scoring engine', () => {
  it('chooses the highest weighted outcome', () => {
    expect(scoreAnswers(scoringFixture, scoringFixture.questions, [0, 0]).winner).toBe('Fire');
  });

  it('returns a secondary chakra nature', () => {
    expect(scoreAnswers(scoringFixture, scoringFixture.questions, [0, 1]).secondary).toBeDefined();
  });

  it('selectQuestions never exceeds the requested count', () => {
    expect(selectQuestions(scoringFixture, 2, () => 0.5)).toHaveLength(2);
  });

  it('shuffle preserves every item', () => {
    expect(shuffle([1, 2, 3], () => 0.2).sort()).toEqual([1, 2, 3]);
  });
});
