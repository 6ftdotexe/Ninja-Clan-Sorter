import {requireSupabase,supabase,unwrap,unwrapMaybe,unwrapRows} from '../lib/supabase';
import type {ChuninExamEntry,CompetitiveLeaderboardEntry,CompetitiveRecord,CompetitiveSeason,ExamAdvanceResult} from '../types';

export const EXAM_STAGES=[
  {id:'tactical',label:'Tactical Examination',description:'Judgment, intelligence, restraint, and mission-readiness under pressure.'},
  {id:'survival',label:'Survival Exercise',description:'Endurance, resource management, and adaptability in a hostile field scenario.'},
  {id:'preliminaries',label:'Preliminary Battles',description:'A controlled combat evaluation that tests whether your build holds up under direct pressure.'},
  {id:'finals',label:'Final Tournament',description:'The highest-pressure competitive stage. Strong performance can earn certification or a championship title.'},
] as const;

export async function getActiveSeason():Promise<CompetitiveSeason|null>{
  if(!supabase)return null;
  return unwrapMaybe<CompetitiveSeason>(await supabase.from('shinobi_competitive_seasons').select('*').eq('status','active').order('starts_at',{ascending:false}).limit(1).maybeSingle());
}

export async function getExamEntry(characterId:string):Promise<ChuninExamEntry|null>{
  if(!supabase)return null;
  const row=unwrapMaybe<ChuninExamEntry>(await supabase.from('chunin_exam_entries').select('*').eq('character_id',characterId).order('created_at',{ascending:false}).limit(1).maybeSingle());
  return row||null;
}

export async function registerForChuninExam(characterId:string):Promise<ChuninExamEntry>{
  return unwrap<ChuninExamEntry>(await requireSupabase().rpc('register_chunin_exam',{p_character_id:characterId}));
}

export async function advanceChuninExam(entryId:string):Promise<ExamAdvanceResult>{
  return unwrap<ExamAdvanceResult>(await requireSupabase().rpc('advance_chunin_exam',{p_entry_id:entryId}));
}

export async function getCompetitiveRecord(characterId:string):Promise<CompetitiveRecord|null>{
  if(!supabase)return null;
  return unwrapMaybe<CompetitiveRecord>(await supabase.rpc('get_shinobi_competitive_record',{p_character_id:characterId}));
}

export async function listCompetitiveLeaderboard(limit=25):Promise<CompetitiveLeaderboardEntry[]>{
  if(!supabase)return[];
  const rows=unwrapMaybe<CompetitiveLeaderboardEntry[]>(await supabase.rpc('list_competitive_leaderboard',{p_limit:Math.min(50,Math.max(1,limit))}));
  return Array.isArray(rows)?rows:[];
}

export async function listMyExamHistory(characterId:string):Promise<ChuninExamEntry[]>{
  if(!supabase)return[];
  return unwrapRows<ChuninExamEntry>(await supabase.from('chunin_exam_entries').select('*').eq('character_id',characterId).order('created_at',{ascending:false}).limit(20));
}
