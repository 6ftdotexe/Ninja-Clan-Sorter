import {supabase} from '../lib/supabase';
import type {CharacterLore,ProfileCustomization,TimelineEvent} from '../types/lore';

export async function getLore(userId:string,characterId:string){
  if(!supabase)return null;
  const {data,error}=await supabase.from('character_lore').select('*').eq('user_id',userId).eq('character_id',characterId).maybeSingle();
  if(error)throw error; return (data??null) as CharacterLore|null;
}

export async function saveLore(lore:CharacterLore){
  if(!supabase)throw new Error('Supabase not configured');
  const {data,error}=await supabase.from('character_lore').upsert({...lore,updated_at:new Date().toISOString()},{onConflict:'character_id'}).select('*').single();
  if(error)throw error; return data as CharacterLore;
}

export async function listTimeline(userId:string,characterId:string){
  if(!supabase)return[];
  const {data,error}=await supabase.from('character_timeline_events').select('*').eq('user_id',userId).eq('character_id',characterId).order('event_order',{ascending:true});
  if(error)throw error; return (data??[]) as TimelineEvent[];
}

export async function replaceTimeline(userId:string,characterId:string,events:Omit<TimelineEvent,'id'|'created_at'>[]){
  if(!supabase)throw new Error('Supabase not configured');
  const {error:delError}=await supabase.from('character_timeline_events').delete().eq('user_id',userId).eq('character_id',characterId);
  if(delError)throw delError;
  if(!events.length)return[];
  const {data,error}=await supabase.from('character_timeline_events').insert(events).select('*');
  if(error)throw error; return (data??[]) as TimelineEvent[];
}

export async function addTimelineEvent(userId:string,characterId:string,title:string,detail:string,eventType='custom',eventOrder=100){
  if(!supabase)throw new Error('Supabase not configured');
  const {data,error}=await supabase.from('character_timeline_events').insert({user_id:userId,character_id:characterId,title:title.trim().slice(0,100),detail:detail.trim().slice(0,600),event_type:eventType,event_order:eventOrder}).select('*').single();
  if(error)throw error; return data as TimelineEvent;
}

export async function deleteTimelineEvent(userId:string,id:string){
  if(!supabase)return; const {error}=await supabase.from('character_timeline_events').delete().eq('id',id).eq('user_id',userId); if(error)throw error;
}

export async function updateCustomization(userId:string,characterId:string,input:ProfileCustomization){
  if(!supabase)throw new Error('Supabase not configured');
  const payload={
    shinobi_alias:input.shinobi_alias?.trim().slice(0,60)||null,
    profile_title:input.profile_title?.trim().slice(0,80)||null,
    profile_theme:input.profile_theme||'void',
    banner_url:input.banner_url?.trim().slice(0,1000)||null,
    featured_art_url:input.featured_art_url?.trim().slice(0,1000)||null,
    updated_at:new Date().toISOString(),
  };
  const {data,error}=await supabase.from('shinobi_characters').update(payload).eq('id',characterId).eq('user_id',userId).select('*').single();
  if(error)throw error; return data;
}

export async function getPublicLore(characterId:string){
  if(!supabase)return null;
  const {data,error}=await supabase.from('character_lore').select('*').eq('character_id',characterId).maybeSingle();
  if(error)throw error; return (data??null) as CharacterLore|null;
}

export async function getPublicTimeline(characterId:string){
  if(!supabase)return[];
  const {data,error}=await supabase.from('character_timeline_events').select('*').eq('character_id',characterId).order('event_order',{ascending:true});
  if(error)throw error; return (data??[]) as TimelineEvent[];
}
