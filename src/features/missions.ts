import {supabase,nowIso,requireSupabase,unwrap,unwrapMaybe,unwrapRows} from '../lib/supabase';
import type {CombatStats,MissionRank,NormalizedShinobiProfile,ShinobiMission,ShinobiProgression} from '../types';
import {levelFromXp} from '../utils/character';

type MissionProgressionRow=Omit<ShinobiProgression,'level'> & {level?:number};

const rankData:Record<MissionRank,{xp:number;rep:number}>={D:{xp:80,rep:8},C:{xp:150,rep:14},B:{xp:300,rep:24},A:{xp:550,rep:40},S:{xp:900,rep:65}};
const locations=['northern trade road','river border','abandoned watch post','mountain pass','old quarry','forest perimeter','coastal checkpoint','desert caravan route','hidden ravine','outer village district'];
const templates=[['Escort Detail','Escort','Protect a civilian convoy through contested territory without disrupting local traffic.'],['Silent Survey','Recon','Survey unusual activity and return with a complete intelligence report.'],['Missing Courier','Tracking','Locate a missing courier and recover the sealed dispatch.'],['Broken Supply Line','Recovery','Restore a disrupted supply route and identify the cause.'],['Border Signals','Investigation','Investigate unexplained signals near the village border and determine their source.'],['Field Rescue','Rescue','Locate stranded operatives and guide them safely back to friendly territory.'],['Archive Retrieval','Recovery','Recover an important village archive before weather or terrain makes access impossible.'],['Night Watch','Security','Secure a vulnerable district and identify suspicious movement without escalating tensions.'],['Storm Route','Navigation','Open a safe route through hazardous terrain for an incoming relief team.'],['Counter-Intel Sweep','Intelligence','Identify a leak in a field operation and protect sensitive village information.']] as const;
const rankOrder:MissionRank[]=['D','C','B','A','S'];
const signature=(profile:NormalizedShinobiProfile)=>[profile.specialty,profile.teamRole,profile.fightingStyle,profile.primaryChakra,profile.secondaryChakra,profile.summon,profile.leadershipStyle].filter(Boolean);
const blankProgression=(userId:string,characterId:string):ShinobiProgression=>({character_id:characterId,user_id:userId,xp:0,level:1,village_reputation:0,completed_missions:0,d_missions:0,c_missions:0,b_missions:0,a_missions:0,s_missions:0,current_title:'New Operative',updated_at:nowIso()});

export function recommendedMissionRank(level:number):MissionRank{if(level>=28)return'S';if(level>=20)return'A';if(level>=12)return'B';if(level>=5)return'C';return'D'}
export function generateMission(profile:NormalizedShinobiProfile,stats:CombatStats,level:number,seed=Date.now()):ShinobiMission{
  const desired=recommendedMissionRank(level),idx=rankOrder.indexOf(desired),wobble=seed%5===0?-1:seed%7===0?1:0,rank=rankOrder[Math.max(0,Math.min(4,idx+wobble))];
  const template=templates[Math.abs(seed)%templates.length],location=locations[Math.abs(Math.floor(seed/7))%locations.length];
  const strongest=Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()));
  const traits=[...signature(profile),...strongest].filter(Boolean).slice(0,5),rewards=rankData[rank];
  return {id:crypto.randomUUID(),title:template[0],rank,category:template[1],objective:template[2],briefing:`${profile.village||'Your village'} intelligence has assigned ${profile.name} to the ${location}. The mission favors ${traits.slice(0,3).join(', ')||'balanced field skills'}. Adapt to changing conditions and prioritize the objective.`,location,recommended_traits:traits,rewards:{xp:rewards.xp,reputation:rewards.rep,badge:rank==='S'?'S-Rank Operative':rank==='A'?'A-Rank Veteran':null},status:'offered'};
}
export function resolveMission(mission:ShinobiMission,profile:NormalizedShinobiProfile,stats:CombatStats){
  const relevant=Object.values(stats).sort((a,b)=>b-a).slice(0,4),average=relevant.reduce((a,b)=>a+b,0)/relevant.length,difficulty={D:42,C:50,B:60,A:70,S:80}[mission.rank];
  const profileBonus=Math.min(9,[profile.specialty,profile.teamRole,profile.fightingStyle,profile.primaryChakra].filter(x=>x&&mission.recommended_traits.some(t=>t.toLowerCase().includes(x.toLowerCase()))).length*3),score=Math.round(average+profileBonus),success=score>=difficulty;
  return {success,outcome:success?`${profile.name} completed ${mission.title} successfully. Their strongest attributes created a ${score-difficulty>=12?'decisive':'controlled'} advantage and the objective was secured.`:`${profile.name} was forced to withdraw from ${mission.title}. The objective exceeded the current operational margin, but the mission still produced useful field experience.`,score,difficulty};
}

export async function getProgression(userId:string,characterId:string){
  if(!supabase)return blankProgression(userId,characterId); const db=supabase;
  const existing=unwrapMaybe<ShinobiProgression>(await db.from('shinobi_progression').select('*').eq('user_id',userId).eq('character_id',characterId).maybeSingle());
  if(existing)return existing;
  return unwrap<ShinobiProgression>(await db.from('shinobi_progression').insert(blankProgression(userId,characterId)).select('*').single());
}
export async function listMissions(userId:string,characterId:string){if(!supabase)return[];return unwrapRows<ShinobiMission>(await supabase.from('shinobi_missions').select('*').eq('user_id',userId).eq('character_id',characterId).order('created_at',{ascending:false}).limit(40))}
export async function acceptMission(userId:string,characterId:string,mission:ShinobiMission){return unwrap<ShinobiMission>(await requireSupabase().from('shinobi_missions').insert({...mission,user_id:userId,character_id:characterId,status:'accepted',accepted_at:nowIso()}).select('*').single())}
export async function abandonMission(userId:string,missionId:string){if(!supabase)return;unwrap(await supabase.from('shinobi_missions').update({status:'abandoned'}).eq('id',missionId).eq('user_id',userId).eq('status','accepted'))}
export async function completeMission(_userId:string,mission:ShinobiMission,outcome:string,success:boolean){const data=unwrap<MissionProgressionRow|MissionProgressionRow[]>(await requireSupabase().rpc('complete_shinobi_mission_v10',{p_mission_id:mission.id,p_outcome:outcome,p_success:success}));const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Mission completion returned no progression data.');return {...row,level:levelFromXp(Number(row.xp||0))} as ShinobiProgression}
