import { describe, expect, it } from 'vitest';
import { tests } from '../index';

const allTests = Object.values(tests);

describe('V9 quiz data contract', () => {
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

  it('keeps configured test lengths inside the available question bank', () => {
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

    const highTierCoverage = rank.questions.filter((question) =>
      question.answers.some((answer) => (answer.scores.kagePotential || 0) > 0),
    ).length;
    const legendaryCoverage = rank.questions.filter((question) =>
      question.answers.some((answer) => (answer.scores.legendary || 0) > 0),
    ).length;

    expect(highTierCoverage).toBe(rank.questions.length);
    expect(legendaryCoverage).toBe(rank.questions.length);
  });

});
