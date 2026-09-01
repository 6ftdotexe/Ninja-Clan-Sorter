import {cleanText,requireSupabase,supabase,unwrapMaybe} from '../lib/supabase';
import type {CareerRecord,ShinobiCharacter,VillageDirectoryEntry,VillageId,VillageProfile} from '../types';

export const VILLAGES:Record<VillageId,{label:string;symbol:string;tagline:string;terrain:string}>={
  Konohagakure:{label:'Konohagakure',symbol:'葉',tagline:'Bonds, growth, and versatile teamwork.',terrain:'Forest stronghold'},
  Sunagakure:{label:'Sunagakure',symbol:'砂',tagline:'Composure, strategy, and resource discipline.',terrain:'Desert fortress'},
  Kumogakure:{label:'Kumogakure',symbol:'雷',tagline:'Momentum, confidence, and elite striking power.',terrain:'Mountain cloud city'},
  Iwagakure:{label:'Iwagakure',symbol:'岩',tagline:'Resolve, defense, and unbreakable endurance.',terrain:'Stone plateau'},
  Kirigakure:{label:'Kirigakure',symbol:'霧',tagline:'Adaptability, intelligence, and concealed pressure.',terrain:'Mist coast'},
};

const isVillageId=(value:unknown):value is VillageId=>typeof value==='string'&&value in VILLAGES;
const number=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;

function normalizeDirectory(row:Record<string,unknown>):VillageDirectoryEntry|null{
  if(!isVillageId(row.village_id))return null;
  return {village_id:row.village_id,member_count:number(row.member_count),public_members:number(row.public_members),total_reputation:number(row.total_reputation),average_level:number(row.average_level),completed_missions:number(row.completed_missions),village_level:Math.max(1,number(row.village_level)),standing_score:number(row.standing_score)};
}

export async function listVillageDirectory():Promise<VillageDirectoryEntry[]>{
  if(!supabase)return Object.keys(VILLAGES).map(village_id=>({village_id:village_id as VillageId,member_count:0,public_members:0,total_reputation:0,average_level:1,completed_missions:0,village_level:1,standing_score:0}));
  const data=unwrapMaybe<unknown>(await supabase.rpc('list_village_directory'));
  const rows=Array.isArray(data)?data:[];
  const byId=new Map(rows.map(row=>[String((row as Record<string,unknown>).village_id),normalizeDirectory(row as Record<string,unknown>)]));
  return (Object.keys(VILLAGES) as VillageId[]).map(village_id=>byId.get(village_id)??{village_id,member_count:0,public_members:0,total_reputation:0,average_level:1,completed_missions:0,village_level:1,standing_score:0}).filter(Boolean) as VillageDirectoryEntry[];
}

export async function getVillageProfile(villageId:string):Promise<VillageProfile|null>{
  if(!supabase||!isVillageId(villageId))return null;
  const data=unwrapMaybe<Record<string,unknown>>(await supabase.rpc('get_village_profile',{p_village_id:villageId}));
  if(!data)return null;
  const summary=normalizeDirectory((data.summary??{}) as Record<string,unknown>);
  if(!summary)return null;
  const members=Array.isArray(data.members)?data.members.map(item=>{
    const row=item as Record<string,unknown>;
    return {character:row.character as ShinobiCharacter,level:number(row.level),reputation:number(row.reputation),completed_missions:number(row.completed_missions),title:cleanText(typeof row.title==='string'?row.title:'',80)||''};
  }).filter(item=>item.character?.id):[];
  return {summary,members};
}

export async function joinVillage(characterId:string,villageId:VillageId){
  return unwrapMaybe(await requireSupabase().rpc('join_village',{p_character_id:characterId,p_village_id:villageId}));
}

export async function leaveVillage(characterId:string){
  return unwrapMaybe(await requireSupabase().rpc('leave_village',{p_character_id:characterId}));
}

export async function getCareerRecord(characterId:string):Promise<CareerRecord|null>{
  if(!supabase||!characterId)return null;
  return unwrapMaybe<CareerRecord>(await supabase.rpc('get_shinobi_career',{p_character_id:characterId}));
}

export async function getPublicCareerRecord(slug:string):Promise<CareerRecord|null>{
  if(!supabase)return null;
  return unwrapMaybe<CareerRecord>(await supabase.rpc('get_public_shinobi_career',{p_slug:cleanText(slug,80)}));
}
