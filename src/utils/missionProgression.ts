import type {NormalizedShinobiProfile} from '../types/combat';import type {ProgressionAchievement,ShinobiProgression} from '../types/progression';
export function levelFromXp(xp:number){return Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/70))+1)}
export function xpForLevel(level:number){return Math.max(0,Math.round((level-1)*(level-1)*70))}
export function xpForNextLevel(level:number){return xpForLevel(level+1)}
export function operationalRank(p:ShinobiProgression,profile:NormalizedShinobiProfile){
 const potential=(profile.rankPotential||'').toLowerCase();let rank='Genin';
 if(p.level>=5&&p.completed_missions>=3)rank='Chūnin';
 if(p.level>=10&&p.completed_missions>=8&&p.b_missions>=1)rank='Special Jōnin';
 if(p.level>=15&&p.completed_missions>=15&&p.b_missions>=3)rank='Jōnin';
 if(p.level>=22&&p.completed_missions>=25&&p.a_missions>=2)rank='Elite Jōnin';
 if(p.level>=30&&p.completed_missions>=40&&p.a_missions>=6)rank='Kage Candidate';
 if(p.level>=40&&p.completed_missions>=60&&p.s_missions>=3&&/(kage potential|legendary)/.test(potential))rank='Kage';
 return rank;
}
export function reputationTitle(rep:number){if(rep>=900)return'Village Legend';if(rep>=600)return'Village Pillar';if(rep>=350)return'Trusted Elite';if(rep>=180)return'Trusted Operative';if(rep>=75)return'Proven Shinobi';if(rep>=25)return'Reliable Genin';return'New Operative'}
export function progressionAchievements(p:ShinobiProgression):ProgressionAchievement[]{return[
 {id:'mission1',icon:'任',label:'First Mission',description:'Complete your first mission.',earned:p.completed_missions>=1},
 {id:'ten',icon:'十',label:'Field Regular',description:'Complete 10 missions.',earned:p.completed_missions>=10},
 {id:'a',icon:'A',label:'A-Rank Veteran',description:'Complete an A-rank mission.',earned:p.a_missions>=1},
 {id:'s',icon:'S',label:'S-Rank Operative',description:'Complete an S-rank mission.',earned:p.s_missions>=1},
 {id:'rep',icon:'里',label:'Village Trusted',description:'Reach 350 village reputation.',earned:p.village_reputation>=350},
 {id:'veteran',icon:'忍',label:'Veteran Shinobi',description:'Reach level 25.',earned:p.level>=25}
]}
