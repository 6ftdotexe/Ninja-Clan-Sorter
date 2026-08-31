import {testOrder} from '../data/quizzes';
import type {CombatStats,NormalizedShinobiProfile,ProgressionAchievement,ShinobiProgression,StatKey,TestId,TestResult} from '../types';

type Results=Partial<Record<TestId,TestResult>>;
type RankRule={minDone:number;label:string};
type OperationalRankRule={label:string;eligible:(progression:ShinobiProgression)=>boolean};

const BASE_STAT=52;
const MIN_STAT=35;
const MAX_STAT=99;
const XP_CURVE=70;
const CORE_TESTS:TestId[]=['clan','village','chakra','summon','mentor','rogue'];
const STAT_KEYS:StatKey[]=['ninjutsu','taijutsu','genjutsu','intelligence','speed','strength','stamina','chakraControl','leadership','adaptability'];
const ARCHIVE_RANKS:RankRule[]=[
  {minDone:13,label:'Legendary Archive'},
  {minDone:11,label:'Kage Candidate'},
  {minDone:9,label:'Elite Jōnin'},
  {minDone:7,label:'Jōnin'},
  {minDone:5,label:'Special Jōnin'},
  {minDone:3,label:'Chūnin'},
  {minDone:1,label:'Genin'},
  {minDone:0,label:'Academy'},
];
const FIELD_RANKS:OperationalRankRule[]=[
  {label:'Kage Candidate',eligible:p=>p.level>=30&&p.completed_missions>=40&&p.a_missions>=6},
  {label:'Elite Jōnin',eligible:p=>p.level>=22&&p.completed_missions>=25&&p.a_missions>=2},
  {label:'Jōnin',eligible:p=>p.level>=15&&p.completed_missions>=15&&p.b_missions>=3},
  {label:'Special Jōnin',eligible:p=>p.level>=10&&p.completed_missions>=8&&p.b_missions>=1},
  {label:'Chūnin',eligible:p=>p.level>=5&&p.completed_missions>=3},
  {label:'Genin',eligible:()=>true},
];
const REPUTATION_TITLES=[
  [900,'Village Legend'],[600,'Village Pillar'],[350,'Trusted Elite'],[180,'Trusted Operative'],[75,'Proven Shinobi'],[25,'Reliable Genin'],[0,'New Operative']
] as const;

const winner=(results:Results,id:TestId)=>results[id]?.winner||'';
const bump=(stats:CombatStats,amount:number,...keys:StatKey[])=>keys.forEach(key=>{stats[key]+=amount});
const profileText=(profile:NormalizedShinobiProfile)=>Object.values({clan:profile.clan,village:profile.village,chakra:profile.primaryChakra,secondary:profile.secondaryChakra,summon:profile.summon,mentor:profile.mentor,shadow:profile.shadow,fighting:profile.fightingStyle,weapon:profile.weaponAffinity,lead:profile.leadershipStyle,rank:profile.rankPotential,inherited:profile.inheritedPotential,specialty:profile.specialty,role:profile.teamRole}).join(' ').toLowerCase();

export function normalizeProfile(name:string,characterId:string|null,results:Results):NormalizedShinobiProfile{
  const chakra=results.chakra;
  return {name:name||'Unnamed Shinobi',characterId,clan:winner(results,'clan'),village:winner(results,'village'),primaryChakra:chakra?.winner||'',secondaryChakra:chakra?.secondary||'',advancedRelease:chakra?.advanced||'',summon:winner(results,'summon'),mentor:winner(results,'mentor'),shadow:winner(results,'rogue'),fightingStyle:winner(results,'fighting'),weaponAffinity:winner(results,'weapon'),leadershipStyle:winner(results,'leadership'),rankPotential:winner(results,'rank'),inheritedPotential:winner(results,'inherited'),specialty:winner(results,'specialty'),teamRole:winner(results,'teamRole'),completion:completion(results).percent,raw:results};
}

export function deriveCombatStats(profile:NormalizedShinobiProfile):CombatStats{
  const stats=Object.fromEntries(STAT_KEYS.map(key=>[key,BASE_STAT])) as CombatStats;
  const text=profileText(profile);
  if(/precision|strateg|analyt|kakashi|control/.test(text))bump(stats,10,'intelligence','chakraControl');
  if(/close|taijutsu|pressure|might guy|strength/.test(text))bump(stats,12,'taijutsu','strength');
  if(/stealth|shadow|crow|genjutsu|deception|itachi|obito/.test(text))bump(stats,10,'genjutsu','intelligence');
  if(/adaptive|water|wind|versatile|monkey/.test(text))bump(stats,11,'adaptability','speed');
  if(/lightning|hawk|mobility|speed/.test(text))bump(stats,10,'speed','ninjutsu');
  if(/earth|slug|turtle|guardian|stamina/.test(text))bump(stats,10,'stamina','strength');
  if(/fire|front-line|assault/.test(text))bump(stats,9,'ninjutsu','strength');
  if(/support|healing|medical/.test(text))bump(stats,11,'chakraControl','leadership');
  if(/commander|inspirer|kage|leadership/.test(text))bump(stats,13,'leadership','intelligence');
  if(/elite|legendary|kage potential/.test(text))bump(stats,7,...STAT_KEYS);
  if(profile.primaryChakra)bump(stats,8,'ninjutsu');
  if(profile.secondaryChakra)bump(stats,4,'ninjutsu','adaptability');
  if(profile.advancedRelease)bump(stats,5,'ninjutsu','chakraControl');
  const confidence=Object.values(profile.raw).filter(Boolean).reduce((sum,result)=>sum+(result?.confidence||0),0)/Math.max(1,Object.keys(profile.raw).length);
  bump(stats,Math.round((confidence-50)/12),'intelligence','adaptability');
  STAT_KEYS.forEach(key=>{stats[key]=Math.max(MIN_STAT,Math.min(MAX_STAT,Math.round(stats[key])))});
  return stats;
}

export const statLabels:Record<StatKey,string>={ninjutsu:'Ninjutsu',taijutsu:'Taijutsu',genjutsu:'Genjutsu',intelligence:'Intelligence',speed:'Speed',strength:'Strength',stamina:'Stamina',chakraControl:'Chakra Control',leadership:'Leadership',adaptability:'Adaptability'};
export const TOTAL_TRIALS=testOrder.length;

export function completion(results:Results){const done=testOrder.filter(id=>Boolean(results[id])).length;return {done,total:TOTAL_TRIALS,percent:Math.round(done/TOTAL_TRIALS*100)}}
export function archiveRank(done:number){return ARCHIVE_RANKS.find(rule=>done>=rule.minDone)?.label||'Academy'}
export function earnedBadges(results:Results){
  const progress=completion(results);
  return [
    {id:'first',label:'First Step',icon:'◆',earned:progress.done>=1},
    {id:'core',label:'Core Identity',icon:'六',earned:CORE_TESTS.every(id=>Boolean(results[id]))},
    {id:'half',label:'Halfway There',icon:'◐',earned:progress.done>=7},
    {id:'advanced',label:'Advanced Operative',icon:'★',earned:progress.done>=10},
    {id:'complete',label:'Identity Complete',icon:'忍',earned:progress.done===progress.total},
  ];
}

export function levelFromXp(xp:number){return Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/XP_CURVE))+1)}
export function xpForLevel(level:number){return Math.max(0,Math.round((level-1)*(level-1)*XP_CURVE))}
export function xpForNextLevel(level:number){return xpForLevel(level+1)}
export function operationalRank(progression:ShinobiProgression,profile:NormalizedShinobiProfile){
  const potential=profile.rankPotential.toLowerCase();
  const kageEligible=progression.level>=40&&progression.completed_missions>=60&&progression.s_missions>=3&&/(kage potential|legendary)/.test(potential);
  if(kageEligible)return 'Kage';
  return FIELD_RANKS.find(rule=>rule.eligible(progression))?.label||'Genin';
}
export function reputationTitle(reputation:number){return REPUTATION_TITLES.find(([minimum])=>reputation>=minimum)?.[1]||'New Operative'}
export function progressionAchievements(progression:ShinobiProgression):ProgressionAchievement[]{return[
  {id:'mission1',icon:'任',label:'First Mission',description:'Complete your first mission.',earned:progression.completed_missions>=1},
  {id:'ten',icon:'十',label:'Field Regular',description:'Complete 10 missions.',earned:progression.completed_missions>=10},
  {id:'a',icon:'A',label:'A-Rank Veteran',description:'Complete an A-rank mission.',earned:progression.a_missions>=1},
  {id:'s',icon:'S',label:'S-Rank Operative',description:'Complete an S-rank mission.',earned:progression.s_missions>=1},
  {id:'rep',icon:'里',label:'Village Trusted',description:'Reach 350 village reputation.',earned:progression.village_reputation>=350},
  {id:'veteran',icon:'忍',label:'Veteran Shinobi',description:'Reach level 25.',earned:progression.level>=25},
]}
