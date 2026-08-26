import type {TestDefinition,TestId} from '../../types/quiz';
import {clanTest} from './clan';import {villageTest} from './village';import {mentorTest} from './mentor';import {rogueTest} from './rogue';import {chakraTest} from './chakra';import {summonTest} from './summon';
export const tests:Record<TestId,TestDefinition>={clan:clanTest,village:villageTest,mentor:mentorTest,rogue:rogueTest,chakra:chakraTest,summon:summonTest};
export const testOrder:TestId[]=['clan','village','mentor','rogue','chakra','summon'];
