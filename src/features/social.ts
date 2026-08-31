import {supabase,cleanText,nowIso,requireSupabase,unwrap,unwrapMaybe,unwrapRows} from '../lib/supabase';
import type {CombatStats,MatchupAnalysis,MatchupRecord,NormalizedShinobiProfile,ShinobiCharacter,ShinobiRival,ShinobiTeam,ShinobiTeamMember,SocialCombatant,StatKey,TeamAnalysis} from '../types';
import {deriveCombatStats} from '../utils/character';

const statKeys:StatKey[]=['ninjutsu','taijutsu','genjutsu','intelligence','speed','strength','stamina','chakraControl','leadership','adaptability'];

async function getAccessibleCharacters(ids:string[]){
 if(!supabase||!ids.length)return[];
 const unique=[...new Set(ids)].slice(0,100);
 const rows=unwrapMaybe<ShinobiCharacter[]>(await supabase.rpc('get_accessible_shinobi_by_ids',{p_ids:unique}));
 return Array.isArray(rows)?rows:[];
}

export function characterToProfile(c:ShinobiCharacter):NormalizedShinobiProfile{
  return {
    name:c.name,characterId:c.id,clan:c.clan||'',village:c.village||'',primaryChakra:c.chakra_primary||'',secondaryChakra:c.chakra_secondary||'',advancedRelease:c.advanced_release||'',summon:c.summon||'',mentor:c.sensei||'',shadow:c.shadow_mirror||'',fightingStyle:'',weaponAffinity:'',leadershipStyle:c.leadership||'',rankPotential:c.rank||'',inheritedPotential:c.inherited_trait||'',specialty:c.specialization||'',teamRole:c.role||'',completion:c.completion_percent||0,raw:{}
  };
}
export function characterCombatant(c:ShinobiCharacter):SocialCombatant{return {character:c,stats:deriveCombatStats(characterToProfile(c))}}
const avg=(s:CombatStats,keys:StatKey[])=>Math.round(keys.reduce((a,k)=>a+s[k],0)/keys.length);
const edge=(a:number,b:number):'left'|'right'|'even'=>Math.abs(a-b)<4?'even':a>b?'left':'right';
const natureCounter=(a:string,b:string)=>{
 const x=a.toLowerCase(),y=b.toLowerCase();
 const pairs:[string,string,string][]=[['water','fire','Water can suppress Fire'],['fire','wind','Fire can exploit Wind-fed pressure'],['wind','lightning','Wind can disrupt Lightning flow'],['lightning','earth','Lightning can pierce Earth defenses'],['earth','water','Earth can contain Water movement']];
 for(const [strong,weak,note] of pairs){if(x.includes(strong)&&y.includes(weak))return {side:'left' as const,note};if(y.includes(strong)&&x.includes(weak))return {side:'right' as const,note};}
 return null;
};
export function analyzeMatchup(left:SocialCombatant,right:SocialCombatant):MatchupAnalysis{
 const l=left.stats,r=right.stats;
 const factors=[
  {label:'Technique',left:avg(l,['ninjutsu','chakraControl']),right:avg(r,['ninjutsu','chakraControl']),note:'Ninjutsu power and chakra control.'},
  {label:'Close Range',left:avg(l,['taijutsu','strength']),right:avg(r,['taijutsu','strength']),note:'Pressure, physical power and close-range control.'},
  {label:'Tactics',left:avg(l,['intelligence','adaptability']),right:avg(r,['intelligence','adaptability']),note:'Planning, reads and adaptation.'},
  {label:'Tempo',left:avg(l,['speed','stamina']),right:avg(r,['speed','stamina']),note:'Initiative and ability to sustain pace.'},
  {label:'Control',left:avg(l,['genjutsu','leadership']),right:avg(r,['genjutsu','leadership']),note:'Deception, composure and field control.'},
 ].map(f=>({...f,edge:edge(f.left,f.right)}));
 let leftScore=Math.round(statKeys.reduce((a,k)=>a+l[k],0)/statKeys.length);
 let rightScore=Math.round(statKeys.reduce((a,k)=>a+r[k],0)/statKeys.length);
 const counters:string[]=[];
 const nc=natureCounter(left.character.chakra_primary||'',right.character.chakra_primary||'');
 if(nc){counters.push(nc.note);if(nc.side==='left')leftScore+=3;else rightScore+=3;}
 if(left.character.summon&&!right.character.summon){leftScore+=2;counters.push(`${left.character.name}'s summon adds field presence.`)}
 if(right.character.summon&&!left.character.summon){rightScore+=2;counters.push(`${right.character.name}'s summon adds field presence.`)}
 const diff=leftScore-rightScore; const winnerId=Math.abs(diff)<2?null:(diff>0?left.character.id:right.character.id); const winnerName=winnerId?(diff>0?left.character.name:right.character.name):'Even Match';
 const confidence=Math.min(88,50+Math.abs(diff)*4);
 const topL=(Object.entries(l) as [StatKey,number][]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>k.replace(/([A-Z])/g,' $1').toLowerCase());
 const topR=(Object.entries(r) as [StatKey,number][]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>k.replace(/([A-Z])/g,' $1').toLowerCase());
 return {winnerId,winnerName,confidence,leftScore,rightScore,summary:winnerId?`${winnerName} holds the stronger projected matchup, but the result depends on controlling tempo and forcing the fight into favorable ranges.`:'The profiles are close enough that tactical choices and terrain are more important than raw ratings.',factors,counters,winConditions:{left:[`Lean on ${topL.join(' and ')}.`,`Force ${right.character.name} away from their strongest range.`,`Use ${left.character.chakra_primary||'chakra'} creatively to control tempo.`],right:[`Lean on ${topR.join(' and ')}.`,`Disrupt ${left.character.name}'s preferred rhythm.`,`Use ${right.character.chakra_primary||'chakra'} to create a favorable opening.`]}};
}
export function analyzeTeam(members:SocialCombatant[]):TeamAnalysis{
 if(!members.length)return {rating:0,cohesion:0,coverage:0,leadership:0,strengths:[],weaknesses:[],roleAssignments:[]};
 const teamAvg=(k:StatKey)=>members.reduce((a,m)=>a+m.stats[k],0)/members.length;
 const overall=Math.round(statKeys.reduce((a,k)=>a+teamAvg(k),0)/statKeys.length);
 const leadership=Math.round(teamAvg('leadership'));
 const coverage=Math.min(100,Math.round(50+new Set(members.flatMap(m=>[m.character.chakra_primary,m.character.chakra_secondary,m.character.role,m.character.specialization]).filter(Boolean)).size*6));
 const spread=Math.max(...members.map(m=>m.stats.adaptability))-Math.min(...members.map(m=>m.stats.adaptability));
 const cohesion=Math.max(40,Math.min(99,Math.round((teamAvg('adaptability')+leadership)/2-spread*.25)));
 const sorted=statKeys.map(k=>[k,teamAvg(k)] as const).sort((a,b)=>b[1]-a[1]);
 const strengths=sorted.slice(0,3).map(([k,v])=>`${k.replace(/([A-Z])/g,' $1')} (${Math.round(v)})`);
 const weaknesses=sorted.slice(-2).map(([k,v])=>`${k.replace(/([A-Z])/g,' $1')} (${Math.round(v)})`);
 const used=new Set<string>();
 const roles=members.map(m=>{const candidates:[string,number][]=[['Tactical Lead',m.stats.intelligence+m.stats.leadership],['Vanguard',m.stats.taijutsu+m.stats.strength],['Striker',m.stats.ninjutsu+m.stats.speed],['Controller',m.stats.genjutsu+m.stats.chakraControl],['Flexible Support',m.stats.adaptability+m.stats.stamina]];candidates.sort((a,b)=>b[1]-a[1]);const found=candidates.find(([r])=>!used.has(r))?.[0]||candidates[0][0];used.add(found);return {characterId:m.character.id,name:m.character.name,role:found}});
 return {rating:overall,cohesion,coverage,leadership,strengths,weaknesses,roleAssignments:roles};
}

export async function listTeams(userId:string){if(!supabase)return[];return unwrapRows<ShinobiTeam>(await supabase.from('shinobi_teams').select('*').eq('user_id',userId).order('updated_at',{ascending:false}))}
export async function createTeam(userId:string,name:string){return unwrap<ShinobiTeam>(await requireSupabase().from('shinobi_teams').insert({user_id:userId,name:cleanText(name,60)||'New Squad'}).select('*').single())}
export async function deleteTeam(userId:string,teamId:string){if(!supabase)return;unwrap(await supabase.from('shinobi_teams').delete().eq('id',teamId).eq('user_id',userId))}
export async function updateTeam(userId:string,teamId:string,name:string,description:string){return unwrap<ShinobiTeam>(await requireSupabase().from('shinobi_teams').update({name:cleanText(name,60)||'Squad',description:cleanText(description,280),updated_at:nowIso()}).eq('id',teamId).eq('user_id',userId).select('*').single())}
export async function listTeamMembers(teamId:string){
 if(!supabase)return[];
 const rows=unwrapRows<ShinobiTeamMember>(await supabase.from('shinobi_team_members').select('*').eq('team_id',teamId).order('position'));
 const ids=rows.map(row=>row.character_id);
 if(!ids.length)return rows;
 const characters=await getAccessibleCharacters(ids);
 const byId=new Map(characters.map(character=>[character.id,character]));
 return rows.map(row=>({...row,character:byId.get(row.character_id)}));
}
export async function addTeamMember(teamId:string,characterId:string){unwrap(await requireSupabase().rpc('add_shinobi_team_member_v10',{p_team_id:teamId,p_character_id:characterId}))}
export async function removeTeamMember(memberId:string){if(!supabase)return;unwrap(await supabase.from('shinobi_team_members').delete().eq('id',memberId))}
export async function addRival(userId:string,characterId:string,rivalCharacterId:string,note=''){return unwrap<ShinobiRival>(await requireSupabase().from('shinobi_rivals').upsert({user_id:userId,character_id:characterId,rival_character_id:rivalCharacterId,note:cleanText(note,200)},{onConflict:'user_id,character_id,rival_character_id'}).select('*').single())}
export async function listRivals(userId:string,characterId?:string){
 if(!supabase)return[];
 let query=supabase.from('shinobi_rivals').select('*').eq('user_id',userId).order('created_at',{ascending:false});
 if(characterId)query=query.eq('character_id',characterId);
 const rows=unwrapRows<ShinobiRival>(await query);
 const ids=[...new Set(rows.flatMap(row=>[row.character_id,row.rival_character_id]))];
 if(!ids.length)return rows;
 const characters=await getAccessibleCharacters(ids);
 const byId=new Map(characters.map(character=>[character.id,character]));
 return rows.map(row=>({...row,character:byId.get(row.character_id),rival:byId.get(row.rival_character_id)}));
}
export async function removeRival(userId:string,id:string){if(!supabase)return;unwrap(await supabase.from('shinobi_rivals').delete().eq('id',id).eq('user_id',userId))}
export async function saveMatchup(userId:string,left:ShinobiCharacter,right:ShinobiCharacter,analysis:MatchupAnalysis){if(!supabase)return null;return unwrap<MatchupRecord>(await supabase.from('shinobi_matchups').insert({user_id:userId,left_character_id:left.id,right_character_id:right.id,winner_character_id:analysis.winnerId,analysis}).select('*').single())}
export async function listMatchups(userId:string,limit=20){if(!supabase)return[];return unwrapRows<MatchupRecord>(await supabase.from('shinobi_matchups').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(limit))}
