import type {NormalizedShinobiProfile} from '../types/combat';
import type {CharacterLore,TimelineEvent} from '../types/lore';
import type {CombatStats} from '../types/combat';

const nice=(v:string,fallback='Unknown')=>v?v.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):fallback;
const pickStrong=(stats:CombatStats)=>Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>nice(k));
const rankWord=(p:NormalizedShinobiProfile)=>nice(p.rankPotential||'jōnin potential');

export function generateLoreDraft(profile:NormalizedShinobiProfile,stats:CombatStats,userId:string):CharacterLore{
  const strengths=pickStrong(stats);
  const village=nice(profile.village,'an independent hidden village');
  const clan=nice(profile.clan,'an uncommon bloodline');
  const chakra=[nice(profile.primaryChakra,''),nice(profile.secondaryChakra,'')].filter(Boolean).join(' and ')||'disciplined chakra control';
  const mentor=nice(profile.mentor,'a demanding field mentor');
  const style=nice(profile.fightingStyle||profile.specialty,'adaptive shinobi tactics');
  const role=nice(profile.teamRole,'flexible operative');
  const summon=nice(profile.summon,'no formal summon');
  const aliasBase=profile.specialty||profile.primaryChakra||profile.clan||'silent';
  return {
    character_id:profile.characterId||'',user_id:userId,
    origin_story:`Raised under the traditions of ${village}, ${profile.name} developed an identity shaped by ${clan}. Early training revealed an unusual affinity for ${chakra}, but raw talent mattered less than the habit of studying every failure and adapting before the next mission.`,
    academy_history:`At the academy, ${profile.name} was known less for following one textbook path and more for leaning into ${style}. Instructors repeatedly noted strengths in ${strengths.join(', ')}, creating the foundation for a ${role.toLowerCase()} who could stay useful when a plan broke down.`,
    mentor_history:`Training under the influence represented by ${mentor} pushed ${profile.name} toward sharper judgment and more deliberate technique design. That mentorship emphasized preparation, restraint, and the difference between having power and knowing when to use it.`,
    turning_point:`The defining shift came during a mission where the original plan failed and the squad had to improvise under pressure. ${profile.name} chose responsibility over reputation, protected the team's objective, and emerged with a clearer understanding of what ${rankWord(profile)} actually demands.`,
    current_objective:`Current priority: refine ${chakra.toLowerCase()} into a signature fighting system, deepen coordination with ${summon.toLowerCase()}, and become the kind of operative ${village} can trust with missions where judgment matters as much as force.`,
    personality_summary:`A ${nice(profile.leadershipStyle,'adaptive').toLowerCase()} shinobi with a ${style.toLowerCase()} approach. Calmest when solving complicated problems, strongest when combining ${strengths.slice(0,2).join(' and ')}, and most dangerous when given enough time to understand an opponent's pattern.`,
    bingo_alias:`${nice(aliasBase)} ${profile.name.split(' ')[0]||'Shinobi'}`,
    threat_rating:rankWord(profile),
    intelligence_notes:`Known affinities: ${chakra}. Primary role: ${role}. Summoning contract: ${summon}. Analysts should expect tactical adaptation rather than a single repeated attack pattern.`,
    updated_at:new Date().toISOString(),
  };
}

export function generateTimelineDraft(profile:NormalizedShinobiProfile,userId:string):Omit<TimelineEvent,'id'|'created_at'>[]{
  const cid=profile.characterId||'';
  const village=nice(profile.village,'Hidden Village');
  return [
    {character_id:cid,user_id:userId,event_type:'academy',title:'Academy Enrollment',detail:`Entered ${village}'s shinobi training system and began formal chakra control work.`,event_order:10},
    {character_id:cid,user_id:userId,event_type:'genin',title:'First Field Assignment',detail:`Began operating in real missions as a ${nice(profile.teamRole,'flexible team member').toLowerCase()}.`,event_order:20},
    {character_id:cid,user_id:userId,event_type:'mentor',title:'Mentorship Shift',detail:`Training philosophy changed under the influence of ${nice(profile.mentor,'an experienced mentor')}.`,event_order:30},
    {character_id:cid,user_id:userId,event_type:'technique',title:'Signature Style Emerges',detail:`Combined ${nice(profile.primaryChakra,'chakra control')} with ${nice(profile.fightingStyle||profile.specialty,'adaptive tactics')} into a recognizable personal style.`,event_order:40},
    {character_id:cid,user_id:userId,event_type:'rank',title:`Projected ${rankWord(profile)}`,detail:`Assessment placed long-term potential at ${rankWord(profile)}, with leadership and mission judgment remaining key advancement factors.`,event_order:50},
  ];
}
