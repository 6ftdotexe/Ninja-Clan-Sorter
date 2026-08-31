import {supabase,cleanText,nowIso,requireSupabase,unwrap,unwrapMaybe,unwrapRows} from '../lib/supabase';
import type {CharacterLore,ShinobiCharacter,TestId,TestResult,TimelineEvent} from '../types';
import {testOrder} from '../data/quizzes';

type CharacterTestRow={test_id:string;result:unknown;completed_at:string|null};
const testIds=new Set<string>(testOrder);
const clampPercent=(value:unknown)=>Math.max(0,Math.min(100,Number.isFinite(Number(value))?Math.round(Number(value)):0));
const normalizeCharacter=(row:ShinobiCharacter):ShinobiCharacter=>({...row,name:cleanText(row.name,60)||'Unnamed Shinobi',completion_percent:clampPercent(row.completion_percent),is_active:Boolean(row.is_active),is_public:Boolean(row.is_public)});
const normalizeResult=(value:unknown,testId:string):TestResult|null=>{if(!testIds.has(testId)||!value||typeof value!=='object')return null;const result=value as Partial<TestResult>;if(typeof result.winner!=='string'||!result.winner.trim())return null;const alternates=Array.isArray(result.alternates)?result.alternates.filter(item=>item&&typeof item.id==='string'&&Number.isFinite(Number(item.percent))).map(item=>({id:item.id,percent:Number(item.percent)})):[];return {...result,testId:testId as TestId,winner:result.winner,confidence:Number.isFinite(Number(result.confidence))?Math.max(0,Math.min(100,Number(result.confidence))):0,alternates} as TestResult};

const winner=(results:Partial<Record<TestId,TestResult>>,id:TestId)=>results[id]?.winner??null;
const testRows=(characterId:string,userId:string,results:Partial<Record<TestId,TestResult>>)=>Object.entries(results).filter(([,result])=>Boolean(result)).map(([testId,result])=>({character_id:characterId,user_id:userId,test_id:testId,result,answers:null,test_length:String(result?.meta?.testLength??'')||null,completed_at:nowIso()}));

export function archiveToCharacter(name:string,results:Partial<Record<TestId,TestResult>>){
  const chakra=results.chakra,completed=Object.keys(results).length;
  return {name:cleanText(name,60)||'Unnamed Shinobi',clan:winner(results,'clan'),village:winner(results,'village'),chakra_primary:chakra?.winner??null,chakra_secondary:chakra?.secondary??null,advanced_release:chakra?.advanced??null,summon:winner(results,'summon'),sensei:winner(results,'mentor'),shadow_mirror:winner(results,'rogue'),rank:winner(results,'rank')||String(results.clan?.meta?.rank??'')||null,role:winner(results,'teamRole')||String(results.clan?.meta?.role??'')||null,leadership:winner(results,'leadership')||String(results.clan?.meta?.leadership??'')||null,inherited_trait:winner(results,'inherited')||String(results.clan?.meta?.inheritedTrait??'')||null,specialization:winner(results,'specialty')||String(results.clan?.meta?.specialty??'')||null,completion_percent:Math.min(100,Math.round(completed/testOrder.length*100))};
}

export async function listCharacters(userId:string){if(!supabase)return[];return unwrapRows<ShinobiCharacter>(await supabase.from('shinobi_characters').select('*').eq('user_id',userId).order('updated_at',{ascending:false})).map(normalizeCharacter)}
export async function createCharacter(userId:string,name='Unnamed Shinobi'){return unwrap<ShinobiCharacter>(await requireSupabase().from('shinobi_characters').insert({user_id:userId,name:cleanText(name,60)||'Unnamed Shinobi',is_active:false}).select('*').single())}
export async function deleteCharacter(id:string){if(!supabase)return;unwrap(await supabase.from('shinobi_characters').delete().eq('id',id))}
export async function updateCharacterName(userId:string,characterId:string,name:string){
  const clean=cleanText(name,60);if(!clean)throw new Error('Shinobi name cannot be empty.');
  return unwrap<ShinobiCharacter>(await requireSupabase().from('shinobi_characters').update({name:clean,updated_at:nowIso()}).eq('id',characterId).eq('user_id',userId).select('*').single());
}
export async function loadCharacterArchive(userId:string,characterId:string){
  const db=requireSupabase();
  const [characterResult,testsResult]=await Promise.all([db.from('shinobi_characters').select('*').eq('id',characterId).eq('user_id',userId).single(),db.from('character_test_results').select('test_id,result,completed_at').eq('character_id',characterId).eq('user_id',userId)]);
  const character=normalizeCharacter(unwrap<ShinobiCharacter>(characterResult)),rows=unwrapRows<CharacterTestRow>(testsResult),results:Partial<Record<TestId,TestResult>>={};
  for(const row of rows){const result=normalizeResult(row.result,row.test_id);if(result)results[result.testId]=result;}
  return {character,results};
}
export async function saveArchiveToCharacter(userId:string,characterId:string,name:string,results:Partial<Record<TestId,TestResult>>){
  const db=requireSupabase();
  unwrap(await db.from('shinobi_characters').update({...archiveToCharacter(name,results),updated_at:nowIso()}).eq('id',characterId).eq('user_id',userId));
  const rows=testRows(characterId,userId,results);if(rows.length)unwrap(await db.from('character_test_results').upsert(rows,{onConflict:'character_id,test_id'}));
}
export async function migrateLocalArchive(userId:string,name:string,results:Partial<Record<TestId,TestResult>>){const character=await createCharacter(userId,name||'My Shinobi');await saveArchiveToCharacter(userId,character.id,name,results);return character}

export type WorldStatItem={label:string;count:number};
export type WorldStats={public_count:number;complete_count:number;clans:WorldStatItem[];villages:WorldStatItem[];chakra:WorldStatItem[];ranks:WorldStatItem[];summons:WorldStatItem[]};
export type PublicCharacterPage={items:ShinobiCharacter[];hasMore:boolean;nextBefore:string|null;nextBeforeId:string|null};
export type PublicProfileBundle={character:ShinobiCharacter|null;lore:CharacterLore|null;timeline:TimelineEvent[]};
const emptyStats:WorldStats={public_count:0,complete_count:0,clans:[],villages:[],chakra:[],ranks:[],summons:[]};
let worldStatsCache:{value:WorldStats;expiresAt:number}|null=null;
let worldStatsInflight:Promise<WorldStats>|null=null;

export function makePublicSlug(name:string,id:string){const base=(name||'shinobi').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'shinobi';return `${base}-${id.replace(/-/g,'').slice(0,8)}`}
export async function publishCharacter(character:ShinobiCharacter,bio=''){
  if(!character.user_id)throw new Error('Only an owned shinobi can be published.');
  const slug=character.public_slug||makePublicSlug(character.name,character.id);
  return unwrap<ShinobiCharacter>(await requireSupabase().from('shinobi_characters').update({is_public:true,public_slug:slug,bio:cleanText(bio,280),published_at:character.published_at||nowIso(),updated_at:nowIso()}).eq('id',character.id).eq('user_id',character.user_id).select('*').single());
}
export async function unpublishCharacter(characterId:string,userId:string){unwrap(await requireSupabase().from('shinobi_characters').update({is_public:false,updated_at:nowIso()}).eq('id',characterId).eq('user_id',userId))}
export async function updatePublicBio(characterId:string,userId:string,bio:string){unwrap(await requireSupabase().from('shinobi_characters').update({bio:cleanText(bio,280),updated_at:nowIso()}).eq('id',characterId).eq('user_id',userId))}
export async function setActiveCharacter(characterId:string){unwrap(await requireSupabase().rpc('set_active_shinobi',{p_character_id:characterId}))}
export async function getPublicCharacter(slug:string){if(!supabase)return null;const row=unwrapMaybe<ShinobiCharacter>(await supabase.rpc('get_public_shinobi_by_slug',{p_slug:cleanText(slug,80)}));return row?normalizeCharacter(row):null}
export async function listPublicCharacters(limit=12){const page=await listPublicCharacterPage(limit);return page.items}
export async function listPublicCharacterPage(limit=12,before:string|null=null,beforeId:string|null=null):Promise<PublicCharacterPage>{
  if(!supabase)return {items:[],hasMore:false,nextBefore:null,nextBeforeId:null};
  const data=unwrapMaybe<Record<string,unknown>>(await supabase.rpc('list_public_shinobi_page',{p_limit:Math.max(1,Math.min(48,Math.trunc(limit))),p_before:before,p_before_id:beforeId}));
  const rows=Array.isArray(data?.items)?data.items as ShinobiCharacter[]:[];
  return {items:rows.map(normalizeCharacter),hasMore:Boolean(data?.has_more),nextBefore:typeof data?.next_before==='string'?data.next_before:null,nextBeforeId:typeof data?.next_before_id==='string'?data.next_before_id:null};
}
export async function getPublicProfileBundle(slug:string):Promise<PublicProfileBundle|null>{
  if(!supabase)return null;
  const data=unwrapMaybe<Record<string,unknown>>(await supabase.rpc('get_public_shinobi_profile_bundle',{p_slug:cleanText(slug,80)}));
  if(!data||typeof data!=='object'||!data.character||typeof data.character!=='object')return null;
  return {character:normalizeCharacter(data.character as ShinobiCharacter),lore:data.lore&&typeof data.lore==='object'?data.lore as CharacterLore:null,timeline:Array.isArray(data.timeline)?data.timeline as TimelineEvent[]:[]};
}
export async function getPublicCharactersByIds(ids:string[]){if(!supabase||!ids.length)return[];const unique=[...new Set(ids)].slice(0,100);const rows=unwrapMaybe<ShinobiCharacter[]>(await supabase.rpc('get_public_shinobi_by_ids',{p_ids:unique}));return (Array.isArray(rows)?rows:[]).map(normalizeCharacter)}
export async function getWorldStats(force=false):Promise<WorldStats>{
  if(!supabase)return emptyStats;
  const now=Date.now();
  if(!force&&worldStatsCache&&worldStatsCache.expiresAt>now)return worldStatsCache.value;
  if(!force&&worldStatsInflight)return worldStatsInflight;
  worldStatsInflight=(async()=>{const data=unwrapMaybe<Record<string,unknown>>(await supabase.rpc('get_shinobi_world_stats'));const value=data&&typeof data==='object'?{...emptyStats,...data} as WorldStats:emptyStats;worldStatsCache={value,expiresAt:Date.now()+60_000};return value;})();
  try{return await worldStatsInflight}finally{worldStatsInflight=null}
}
export async function copyShareUrl(slug:string){
  const url=`${window.location.origin}${window.location.pathname}#/shinobi/${encodeURIComponent(slug)}`;
  if(navigator.share){try{await navigator.share({title:'My Shinobi Identity',text:'View my Shinobi Identity Archive profile.',url});return url}catch(error){if((error as DOMException)?.name!=='AbortError')throw error;return url}}
  await navigator.clipboard.writeText(url);return url;
}
