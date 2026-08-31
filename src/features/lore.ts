import {supabase,cleanText,nowIso,requireSupabase,unwrap,unwrapMaybe,unwrapRows} from '../lib/supabase';
import type {CharacterLore,CombatStats,NormalizedShinobiProfile,ProfileCustomization,ShinobiCharacter,TimelineEvent} from '../types';

const nice=(value:string,fallback='Unknown')=>value?value.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):fallback;
const strongest=(stats:CombatStats)=>Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>nice(key));
const rankWord=(profile:NormalizedShinobiProfile)=>nice(profile.rankPotential||'jōnin potential');

export function generateLoreDraft(profile:NormalizedShinobiProfile,stats:CombatStats,userId:string):CharacterLore{
  const strengths=strongest(stats),village=nice(profile.village,'an independent hidden village'),clan=nice(profile.clan,'an uncommon bloodline'),chakra=[nice(profile.primaryChakra,''),nice(profile.secondaryChakra,'')].filter(Boolean).join(' and ')||'disciplined chakra control',mentor=nice(profile.mentor,'a demanding field mentor'),style=nice(profile.fightingStyle||profile.specialty,'adaptive shinobi tactics'),role=nice(profile.teamRole,'flexible operative'),summon=nice(profile.summon,'no formal summon'),aliasBase=profile.specialty||profile.primaryChakra||profile.clan||'silent';
  return {character_id:profile.characterId||'',user_id:userId,origin_story:`Raised under the traditions of ${village}, ${profile.name} developed an identity shaped by ${clan}. Early training revealed an unusual affinity for ${chakra}, but raw talent mattered less than the habit of studying every failure and adapting before the next mission.`,academy_history:`At the academy, ${profile.name} was known less for following one textbook path and more for leaning into ${style}. Instructors repeatedly noted strengths in ${strengths.join(', ')}, creating the foundation for a ${role.toLowerCase()} who could stay useful when a plan broke down.`,mentor_history:`Training under the influence represented by ${mentor} pushed ${profile.name} toward sharper judgment and more deliberate technique design. That mentorship emphasized preparation, restraint, and the difference between having power and knowing when to use it.`,turning_point:`The defining shift came during a mission where the original plan failed and the squad had to improvise under pressure. ${profile.name} chose responsibility over reputation, protected the team's objective, and emerged with a clearer understanding of what ${rankWord(profile)} actually demands.`,current_objective:`Current priority: refine ${chakra.toLowerCase()} into a signature fighting system, deepen coordination with ${summon.toLowerCase()}, and become the kind of operative ${village} can trust with missions where judgment matters as much as force.`,personality_summary:`A ${nice(profile.leadershipStyle,'adaptive').toLowerCase()} shinobi with a ${style.toLowerCase()} approach. Calmest when solving complicated problems, strongest when combining ${strengths.slice(0,2).join(' and ')}, and most dangerous when given enough time to understand an opponent's pattern.`,bingo_alias:`${nice(aliasBase)} ${profile.name.split(' ')[0]||'Shinobi'}`,threat_rating:rankWord(profile),intelligence_notes:`Known affinities: ${chakra}. Primary role: ${role}. Summoning contract: ${summon}. Analysts should expect tactical adaptation rather than a single repeated attack pattern.`,updated_at:nowIso()};
}

export function generateTimelineDraft(profile:NormalizedShinobiProfile,userId:string):Omit<TimelineEvent,'id'|'created_at'>[]{
  const characterId=profile.characterId||'',village=nice(profile.village,'Hidden Village');
  return [
    {character_id:characterId,user_id:userId,event_type:'academy',title:'Academy Enrollment',detail:`Entered ${village}'s shinobi training system and began formal chakra control work.`,event_order:10},
    {character_id:characterId,user_id:userId,event_type:'genin',title:'First Field Assignment',detail:`Began operating in real missions as a ${nice(profile.teamRole,'flexible team member').toLowerCase()}.`,event_order:20},
    {character_id:characterId,user_id:userId,event_type:'mentor',title:'Mentorship Shift',detail:`Training philosophy changed under the influence of ${nice(profile.mentor,'an experienced mentor')}.`,event_order:30},
    {character_id:characterId,user_id:userId,event_type:'technique',title:'Signature Style Emerges',detail:`Combined ${nice(profile.primaryChakra,'chakra control')} with ${nice(profile.fightingStyle||profile.specialty,'adaptive tactics')} into a recognizable personal style.`,event_order:40},
    {character_id:characterId,user_id:userId,event_type:'rank',title:`Projected ${rankWord(profile)}`,detail:`Assessment placed long-term potential at ${rankWord(profile)}, with leadership and mission judgment remaining key advancement factors.`,event_order:50},
  ];
}

export async function getLore(userId:string,characterId:string){if(!supabase)return null;return unwrapMaybe<CharacterLore>(await supabase.from('character_lore').select('*').eq('user_id',userId).eq('character_id',characterId).maybeSingle())}
export async function saveLore(lore:CharacterLore){return unwrap<CharacterLore>(await requireSupabase().from('character_lore').upsert({...lore,updated_at:nowIso()},{onConflict:'character_id'}).select('*').single())}
export async function listTimeline(userId:string,characterId:string){if(!supabase)return[];return unwrapRows<TimelineEvent>(await supabase.from('character_timeline_events').select('*').eq('user_id',userId).eq('character_id',characterId).order('event_order',{ascending:true}))}
export async function replaceTimeline(userId:string,characterId:string,events:Omit<TimelineEvent,'id'|'created_at'>[]){
  const db=requireSupabase();
  unwrap(await db.from('character_timeline_events').delete().eq('user_id',userId).eq('character_id',characterId));
  if(!events.length)return[];
  return unwrapRows<TimelineEvent>(await db.from('character_timeline_events').insert(events).select('*'));
}
export async function addTimelineEvent(userId:string,characterId:string,title:string,detail:string,eventType='custom',eventOrder=100){
  return unwrap<TimelineEvent>(await requireSupabase().from('character_timeline_events').insert({user_id:userId,character_id:characterId,title:cleanText(title,100)||'Untitled Event',detail:cleanText(detail,600)||'',event_type:eventType,event_order:eventOrder}).select('*').single());
}
export async function deleteTimelineEvent(userId:string,id:string){if(!supabase)return;unwrap(await supabase.from('character_timeline_events').delete().eq('id',id).eq('user_id',userId))}
export async function updateCustomization(userId:string,characterId:string,input:ProfileCustomization){
  const payload={shinobi_alias:cleanText(input.shinobi_alias,60),profile_title:cleanText(input.profile_title,80),profile_theme:input.profile_theme||'void',banner_url:cleanText(input.banner_url,1000),featured_art_url:cleanText(input.featured_art_url,1000),updated_at:nowIso()};
  return unwrap<ShinobiCharacter>(await requireSupabase().from('shinobi_characters').update(payload).eq('id',characterId).eq('user_id',userId).select('*').single());
}
export async function getPublicLore(characterId:string){if(!supabase)return null;return unwrapMaybe<CharacterLore>(await supabase.rpc('get_public_shinobi_lore',{p_character_id:characterId}))}
export async function getPublicTimeline(characterId:string){if(!supabase)return[];const rows=unwrapMaybe<TimelineEvent[]>(await supabase.rpc('get_public_shinobi_timeline',{p_character_id:characterId}));return Array.isArray(rows)?rows:[]}
