import type { Answer, Question, TestDefinition, TestId } from '../../types/quiz';
import { clanTest } from './clan';
import { villageTest } from './village';
import { mentorTest } from './mentor';
import { rogueTest } from './rogue';
import { chakraTest } from './chakra';
import { summonTest } from './summon';
import { fightingTest, weaponTest, leadershipTest, rankTest, inheritedTest, specialtyTest, teamRoleTest } from './phase2';

/**
 * V9 quiz contract: every rendered question has exactly four distinct answers.
 * Older core tests were originally authored with 5–8 valid choices per question.
 * We keep those choices in their source banks, then select a deterministic rotating
 * set of four so each run remains readable without permanently deleting outcomes.
 */
function fourDistinctAnswers(answers: Answer[], questionIndex: number): Answer[] {
  const unique = answers.filter((item, index, all) =>
    item.text.trim().length > 0 && all.findIndex((candidate) => candidate.text.trim().toLowerCase() === item.text.trim().toLowerCase()) === index,
  );

  if (unique.length < 4) {
    throw new Error(`Quiz data error: question has only ${unique.length} distinct answer options.`);
  }

  if (unique.length === 4) return unique;

  const start = (questionIndex * 3) % unique.length;
  return Array.from({ length: 4 }, (_, offset) => unique[(start + offset) % unique.length]);
}

function normalizeTest(test: TestDefinition): TestDefinition {
  const questions: Question[] = test.questions.map((item, index) => ({
    ...item,
    prompt: item.prompt.trim(),
    answers: fourDistinctAnswers(item.answers, index),
  }));

  return {
    ...test,
    questionCount: questions.length,
    questions,
    lengths: test.lengths
      ? {
          short: Math.min(test.lengths.short, questions.length),
          medium: Math.min(test.lengths.medium, questions.length),
          long: Math.min(test.lengths.long, questions.length),
        }
      : undefined,
  };
}

const rawTests: Record<TestId, TestDefinition> = {
  clan: clanTest,
  village: villageTest,
  mentor: mentorTest,
  rogue: rogueTest,
  chakra: chakraTest,
  summon: summonTest,
  fighting: fightingTest,
  weapon: weaponTest,
  leadership: leadershipTest,
  rank: rankTest,
  inherited: inheritedTest,
  specialty: specialtyTest,
  teamRole: teamRoleTest,
};

export const tests: Record<TestId, TestDefinition> = Object.fromEntries(
  Object.entries(rawTests).map(([id, test]) => [id, normalizeTest(test)]),
) as Record<TestId, TestDefinition>;

export const testOrder: TestId[] = ['clan', 'village', 'chakra', 'summon', 'mentor', 'rogue', 'fighting', 'weapon', 'leadership', 'rank', 'inherited', 'specialty', 'teamRole'];
export const coreTests: TestId[] = ['clan', 'village', 'chakra', 'summon', 'mentor', 'rogue'];
export const advancedTests: TestId[] = ['fighting', 'weapon', 'leadership', 'rank', 'inherited', 'specialty', 'teamRole'];
