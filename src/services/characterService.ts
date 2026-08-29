import {supabase} from '../lib/supabase';
import type {TestId,TestResult} from '../types/quiz';

export type ShinobiCharacter={id:string;user_id:string;name:string;clan:string|null;village:string|null;chakra_primary:string|null;chakra_secondary:string|null;advanced_release:string|null;summon:string|null;sensei:string|null;shadow_mirror:string|null;rank:string|null;role:string|null;leadership:string|null;inherited_trait:string|null;specialization:string|null;portrait_url:string|null;completion_percent:number;is_active:boolean;is_public:boolean;public_slug:string|null;bio:string|null;published_at:string|null;created_at:string;updated_at:string};

const winner=(results:Partial<Record<TestId,TestResult>>,id:TestId)=>results[id]?.winner??null;
export function archiveToCharacter(name:string,results:Partial<Record<TestId,TestResult>>){
  const chakra=results.chakra;
  const completed=Object.keys(results).length;
  return {
    name:name||'Unnamed Shinobi',
    clan:winner(results,'clan'),
    village:winner(results,'village'),
    chakra_primary:chakra?.winner??null,
    chakra_secondary:chakra?.secondary??null,
    advanced_release:chakra?.advanced??null,
    summon:winner(results,'summon'),
    sensei:winner(results,'mentor'),
    shadow_mirror:winner(results,'rogue'),
    rank:winner(results,'rank')||String(results.clan?.meta?.rank??'')||null,
    role:winner(results,'teamRole')||String(results.clan?.meta?.role??'')||null,
    leadership:winner(results,'leadership')||String(results.clan?.meta?.leadership??'')||null,
    inherited_trait:winner(results,'inherited')||String(results.clan?.meta?.inheritedTrait??'')||null,
    specialization:winner(results,'specialty')||String(results.clan?.meta?.specialty??'')||null,
    completion_percent:Math.min(100,Math.round(completed/13*100))
  };
}

export async function listCharacters(userId:string){
  if(!supabase)return[];
  const {data,error}=await supabase.from('shinobi_characters').select('*').eq('user_id',userId).order('updated_at',{ascending:false});
  if(error)throw error;
  return(data??[]) as ShinobiCharacter[];
}

export async function createCharacter(userId:string,name='Unnamed Shinobi'){
  if(!supabase)throw new Error('Supabase not configured');
  const {data,error}=await supabase.from('shinobi_characters').insert({user_id:userId,name,is_active:false}).select('*').single();
  if(error)throw error;
  return data as ShinobiCharacter;
}

export async function deleteCharacter(id:string){
  if(!supabase)return;
  const {error}=await supabase.from('shinobi_characters').delete().eq('id',id);
  if(error)throw error;
}

export async function updateCharacterName(userId:string,characterId:string,name:string){
  if(!supabase)throw new Error('Supabase not configured');
  const clean=name.trim().replace(/\s+/g,' ').slice(0,60);
  if(!clean)throw new Error('Shinobi name cannot be empty.');
  const {data,error}=await supabase
    .from('shinobi_characters')
    .update({name:clean,updated_at:new Date().toISOString()})
    .eq('id',characterId)
    .eq('user_id',userId)
    .select('*')
    .single();
  if(error)throw error;
  return data as ShinobiCharacter;
}

export async function loadCharacterArchive(userId:string,characterId:string){
  if(!supabase)throw new Error('Supabase not configured');
  const [{data:character,error:characterError},{data:testRows,error:testError}]=await Promise.all([
    supabase.from('shinobi_characters').select('*').eq('id',characterId).eq('user_id',userId).single(),
    supabase.from('character_test_results').select('test_id,result,completed_at').eq('character_id',characterId).eq('user_id',userId)
  ]);
  if(characterError)throw characterError;
  if(testError)throw testError;
  const results:Partial<Record<TestId,TestResult>>={};
  for(const row of testRows??[]){
    if(row?.test_id&&row?.result)results[row.test_id as TestId]=row.result as TestResult;
  }
  return {character:character as ShinobiCharacter,results};
}

export async function saveArchiveToCharacter(userId:string,characterId:string,name:string,results:Partial<Record<TestId,TestResult>>){
  if(!supabase)throw new Error('Supabase not configured');
  const payload={...archiveToCharacter(name,results),updated_at:new Date().toISOString()};
  const {error}=await supabase.from('shinobi_characters').update(payload).eq('id',characterId).eq('user_id',userId);
  if(error)throw error;
  for(const [testId,result] of Object.entries(results)){
    if(!result)continue;
    const {error:testError}=await supabase.from('character_test_results').upsert({
      character_id:characterId,
      user_id:userId,
      test_id:testId,
      result,
      answers:null,
      test_length:String(result.meta?.testLength??'')||null,
      completed_at:new Date().toISOString()
    },{onConflict:'character_id,test_id'});
    if(testError)throw testError;
  }
}

export async function migrateLocalArchive(userId:string,name:string,results:Partial<Record<TestId,TestResult>>){
  if(!supabase)throw new Error('Supabase not configured');
  const character=await createCharacter(userId,name||'My Shinobi');
  await saveArchiveToCharacter(userId,character.id,name,results);
  return character;
}
