import type {TestDefinition,TestId} from '../../types/quiz';
import {clanTest} from './clan';import {villageTest} from './village';import {mentorTest} from './mentor';import {rogueTest} from './rogue';import {chakraTest} from './chakra';import {summonTest} from './summon';
import {fightingTest,weaponTest,leadershipTest,rankTest,inheritedTest,specialtyTest,teamRoleTest} from './phase2';
export const tests:Record<TestId,TestDefinition>={clan:clanTest,village:villageTest,mentor:mentorTest,rogue:rogueTest,chakra:chakraTest,summon:summonTest,fighting:fightingTest,weapon:weaponTest,leadership:leadershipTest,rank:rankTest,inherited:inheritedTest,specialty:specialtyTest,teamRole:teamRoleTest};
export const testOrder:TestId[]=['clan','village','chakra','summon','mentor','rogue','fighting','weapon','leadership','rank','inherited','specialty','teamRole'];
export const coreTests:TestId[]=['clan','village','chakra','summon','mentor','rogue'];
export const advancedTests:TestId[]=['fighting','weapon','leadership','rank','inherited','specialty','teamRole'];
