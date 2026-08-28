# V9 Quiz Hotfix

This patch stabilizes quiz behavior before V10 work begins.

## Fixed
- Every rendered quiz question now has exactly four distinct answer options.
- Legacy core tests with 5–8 authored answers are normalized to a deterministic rotating set of four without deleting the source question bank.
- Phase 2 advanced tests were rewritten so answer text actually matches each question instead of reusing generic outcome labels.
- Advanced answers now use intentional score mappings, including secondary affinities where useful.
- Test lengths are clamped to the available question bank.
- Added automated quiz-data validation for prompts, IDs, answer count, duplicate answers, score mappings, and test lengths.

## Quiz contract
Each rendered question must:
1. have a non-empty prompt;
2. have exactly four distinct answers;
3. give every answer at least one valid score mapping;
4. only score outcomes defined by that test.
