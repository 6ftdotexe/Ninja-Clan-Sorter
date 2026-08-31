import type {CombatStats,NormalizedShinobiProfile} from '../types/combat';
import type {MissionRank,ShinobiMission} from '../types/progression';

const rankData:Record<MissionRank,{xp:number;rep:number}>={D:{xp:80,rep:8},C:{xp:150,rep:14},B:{xp:300,rep:24},A:{xp:550,rep:40},S:{xp:900,rep:65}};
const locations=['northern trade road','river border','abandoned watch post','mountain pass','old quarry','forest perimeter','coastal checkpoint','desert caravan route','hidden ravine','outer village district'];
const templates=[
 ['Escort Detail','Escort','Protect a civilian convoy through contested territory without disrupting local traffic.'],
 ['Silent Survey','Recon','Survey unusual activity and return with a complete intelligence report.'],
 ['Missing Courier','Tracking','Locate a missing courier and recover the sealed dispatch.'],
 ['Broken Supply Line','Recovery','Restore a disrupted supply route and identify the cause.'],
 ['Border Signals','Investigation','Investigate unexplained signals near the village border and determine their source.'],
 ['Field Rescue','Rescue','Locate stranded operatives and guide them safely back to friendly territory.'],
 ['Archive Retrieval','Recovery','Recover an important village archive before weather or terrain makes access impossible.'],
 ['Night Watch','Security','Secure a vulnerable district and identify suspicious movement without escalating tensions.'],
 ['Storm Route','Navigation','Open a safe route through hazardous terrain for an incoming relief team.'],
 ['Counter-Intel Sweep','Intelligence','Identify a leak in a field operation and protect sensitive village information.']
] as const;
const signature=(p:NormalizedShinobiProfile)=>[p.specialty,p.teamRole,p.fightingStyle,p.primaryChakra,p.secondaryChakra,p.summon,p.leadershipStyle].filter(Boolean);
export function recommendedMissionRank(level:number):MissionRank{if(level>=28)return'S';if(level>=20)return'A';if(level>=12)return'B';if(level>=5)return'C';return'D'}
export function generateMission(profile:NormalizedShinobiProfile,stats:CombatStats,level:number,seed=Date.now()):ShinobiMission{
 const desired=recommendedMissionRank(level);const rankOrder:MissionRank[]=['D','C','B','A','S'];const idx=rankOrder.indexOf(desired);const wobble=(seed%5===0?-1:seed%7===0?1:0);const rank=rankOrder[Math.max(0,Math.min(4,idx+wobble))];
 const t=templates[Math.abs(seed)%templates.length];const loc=locations[Math.abs(Math.floor(seed/7))%locations.length];
 const top=Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()));
 const traits=[...signature(profile),...top].filter(Boolean).slice(0,5);
 const data=rankData[rank];
 return {id:crypto.randomUUID(),title:t[0],rank,category:t[1],objective:t[2],briefing:`${profile.village||'Your village'} intelligence has assigned ${profile.name} to the ${loc}. The mission favors ${traits.slice(0,3).join(', ')||'balanced field skills'}. Adapt to changing conditions and prioritize the objective.`,location:loc,recommended_traits:traits,rewards:{xp:data.xp,reputation:data.rep,badge:rank==='S'?'S-Rank Operative':rank==='A'?'A-Rank Veteran':null},status:'offered'};
}
export function resolveMission(mission:ShinobiMission,profile:NormalizedShinobiProfile,stats:CombatStats){
 const relevant=Object.values(stats).sort((a,b)=>b-a).slice(0,4);const avg=relevant.reduce((a,b)=>a+b,0)/relevant.length;const rankDifficulty={D:42,C:50,B:60,A:70,S:80}[mission.rank];const profileBonus=Math.min(9,[profile.specialty,profile.teamRole,profile.fightingStyle,profile.primaryChakra].filter(x=>x&&mission.recommended_traits.some(t=>t.toLowerCase().includes(x.toLowerCase()))).length*3);const score=Math.round(avg+profileBonus);const success=score>=rankDifficulty;
 const outcome=success?`${profile.name} completed ${mission.title} successfully. Their strongest attributes created a ${score-rankDifficulty>=12?'decisive':'controlled'} advantage and the objective was secured.`:`${profile.name} was forced to withdraw from ${mission.title}. The objective exceeded the current operational margin, but the mission still produced useful field experience.`;
 return {success,outcome,score,difficulty:rankDifficulty};
}
