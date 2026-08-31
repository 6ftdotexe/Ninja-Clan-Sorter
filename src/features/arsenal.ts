import {supabase,requireSupabase,unwrap,unwrapRows} from '../lib/supabase';
import type {JutsuRank,JutsuSlot,JutsuTechnique,NormalizedShinobiProfile} from '../types';

type JutsuRow={id:string;character_id?:string;user_id?:string;name:string;rank:JutsuRank;type:string;chakra_nature:string|null;range:string;role:string;chakra_cost:string|null;description:string;strengths:string[];weaknesses:string[];requirements:string[];synergies:string[];slot:JutsuSlot|null;created_at?:string};
import {deriveCombatStats} from '../utils/character';

const pick=<T,>(items:T[],seed:number)=>items[Math.abs(seed)%items.length];
const hash=(value:string)=>[...value].reduce((acc,char)=>((acc<<5)-acc+char.charCodeAt(0))|0,0);
const uniqueSlots:JutsuSlot[]=['signature','ultimate','summoning'];
const prefixes:Record<string,string[]>={Fire:['Ember','Inferno','Crimson'],Wind:['Gale','Razor','Sky'],Lightning:['Volt','Thunder','Flash'],Earth:['Stone','Bastion','Quake'],Water:['Tide','Mist','Torrent']};

function rankFor(profile:NormalizedShinobiProfile,seed:number):JutsuRank{
  const rank=profile.rankPotential.toLowerCase();
  const pool:JutsuRank[]=rank.includes('legendary')||rank.includes('kage')?['B','A','A','S']:rank.includes('elite')||rank.includes('jōnin')||rank.includes('jonin')?['C','B','A','A']:['D','C','B'];
  return pick(pool,seed);
}
function mapJutsuRow(row:JutsuRow):JutsuTechnique{return {id:row.id,character_id:row.character_id,user_id:row.user_id,name:row.name,rank:row.rank,type:row.type,chakraNature:row.chakra_nature||'',range:row.range,role:row.role,chakraCost:row.chakra_cost||'',description:row.description,strengths:row.strengths,weaknesses:row.weaknesses,requirements:row.requirements,synergies:row.synergies,slot:row.slot||null,created_at:row.created_at}}
function jutsuPayload(userId:string,characterId:string,jutsu:JutsuTechnique){return {user_id:userId,character_id:characterId,name:jutsu.name,rank:jutsu.rank,type:jutsu.type,chakra_nature:jutsu.chakraNature,range:jutsu.range,role:jutsu.role,chakra_cost:jutsu.chakraCost,description:jutsu.description,strengths:jutsu.strengths,weaknesses:jutsu.weaknesses,requirements:jutsu.requirements,synergies:jutsu.synergies,slot:jutsu.slot}}

export function generateTechnique(profile:NormalizedShinobiProfile,index=0):JutsuTechnique{
  const seed=hash(`${profile.name}-${profile.clan}-${profile.primaryChakra}-${profile.fightingStyle}-${index}-${Date.now()}`);
  const stats=deriveCombatStats(profile);
  const nature=profile.advancedRelease||[profile.primaryChakra,profile.secondaryChakra].filter(Boolean).join(' + ')||'Chakra';
  const prefix=pick(prefixes[profile.primaryChakra]||['Shadow','Spirit','Hidden'],seed);
  const suffix=pick(['Step','Lance','Veil','Current','Formation','Pulse','Prism','Fang','Spiral','Ward'],seed>>2);
  const style=profile.fightingStyle.toLowerCase();
  const role=style.includes('support')?'Support':style.includes('control')?'Control':style.includes('stealth')?'Stealth':style.includes('close')?'Close-range':style.includes('precision')?'Precision':'Adaptive';
  const rank=rankFor(profile,seed);
  const ranges=role==='Close-range'?['Contact','0–5 m']:role==='Precision'?['15–40 m','Long range']:['5–20 m','Mid range'];
  return {id:`local-${Date.now()}-${Math.abs(seed)}`,name:`${prefix} ${suffix}`,rank,type:rank==='S'?'Secret Technique':rank==='A'?'Advanced Ninjutsu':'Ninjutsu',chakraNature:nature,range:pick(ranges,seed),role,chakraCost:rank==='S'?'Extreme':rank==='A'?'High':rank==='B'?'Moderate':'Low',description:`A ${role.toLowerCase()} technique shaped by ${profile.clan||'the user’s bloodline'} instincts and ${nature} chakra. It emphasizes ${profile.specialty||profile.fightingStyle||'adaptive fieldcraft'} while staying consistent with the shinobi’s established profile.`,strengths:[stats.chakraControl>70?'Exceptional chakra precision':'Reliable execution',stats.speed>70?'Fast activation':'Flexible timing',profile.teamRole?`Synergizes with ${profile.teamRole}`:'Adaptable squad utility'],weaknesses:[rank==='S'?'Severe chakra drain':'Reduced effectiveness when overused',role==='Close-range'?'Requires proximity':'Needs clean positioning'],requirements:[profile.primaryChakra?`${profile.primaryChakra} affinity`:'Developed chakra control',profile.inheritedPotential||'Advanced chakra discipline'],synergies:[profile.secondaryChakra||profile.summon||profile.weaponAffinity||'Team coordination'],slot:null};
}

export async function listJutsu(userId:string,characterId:string){
  if(!supabase)return[]; const db=supabase;
  const rows=unwrapRows<JutsuRow>(await db.from('jutsu_techniques').select('*').eq('user_id',userId).eq('character_id',characterId).order('created_at',{ascending:false}));
  return rows.map(mapJutsuRow);
}
export async function saveJutsu(userId:string,characterId:string,jutsu:JutsuTechnique){
  const db=requireSupabase();
  const row=unwrap<JutsuRow>(await db.from('jutsu_techniques').insert(jutsuPayload(userId,characterId,jutsu)).select('*').single());
  return mapJutsuRow(row);
}
export async function deleteJutsu(id:string,userId:string){
  if(!supabase)return; unwrap(await supabase.from('jutsu_techniques').delete().eq('id',id).eq('user_id',userId));
}
export async function setJutsuSlot(id:string,userId:string,characterId:string,slot:JutsuSlot|null){
  if(!supabase)return; const db=supabase;
  if(slot&&uniqueSlots.includes(slot))unwrap(await db.from('jutsu_techniques').update({slot:null}).eq('user_id',userId).eq('character_id',characterId).eq('slot',slot));
  unwrap(await db.from('jutsu_techniques').update({slot}).eq('id',id).eq('user_id',userId));
}
