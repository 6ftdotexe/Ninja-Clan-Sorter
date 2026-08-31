import type {TestId,TestResult} from './quiz';

export type StatKey='ninjutsu'|'taijutsu'|'genjutsu'|'intelligence'|'speed'|'strength'|'stamina'|'chakraControl'|'leadership'|'adaptability';
export type CombatStats=Record<StatKey,number>;
export type JutsuRank='D'|'C'|'B'|'A'|'S';
export type JutsuSlot='standard'|'advanced'|'signature'|'ultimate'|'summoning';
export interface NormalizedShinobiProfile{
  name:string;characterId:string|null;clan:string;village:string;primaryChakra:string;secondaryChakra:string;advancedRelease:string;summon:string;mentor:string;shadow:string;fightingStyle:string;weaponAffinity:string;leadershipStyle:string;rankPotential:string;inheritedPotential:string;specialty:string;teamRole:string;completion:number;raw:Partial<Record<TestId,TestResult>>;
}
export interface JutsuTechnique{
  id:string;character_id?:string;user_id?:string;name:string;rank:JutsuRank;type:string;chakraNature:string;range:string;role:string;chakraCost:string;description:string;strengths:string[];weaknesses:string[];requirements:string[];synergies:string[];slot:JutsuSlot|null;created_at?:string;
}
