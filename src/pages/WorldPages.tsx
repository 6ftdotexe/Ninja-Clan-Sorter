import {useEffect,useMemo,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {errorMessage,useActiveShinobi,useAsyncAction,Feedback} from '../lib/app';
import {EmptyMessage,PageHeader,ProgressBar,SectionHeader} from '../lib/ui';
import {ActivityChallenge,CombatEncounter,type ActivityResult,type CombatOpponent,type CombatResult} from '../lib/minigames';
import {becomeRogue,getCareerRecord,getRogueProfile,getVillageProfile,joinVillage,leaveVillage,listActiveWorldEvents,listMyWorldEventParticipation,listPublicBingoBook,listVillageDirectory,participateWorldEvent,renounceRogueStatus,VILLAGES} from '../features/world';
import {effectiveCombatStats,equipmentBonuses,getTrainingProfile,listEquipment,trainStat} from '../features/training';
import {listJutsu} from '../features/arsenal';
import {statLabels} from '../utils/character';
import type {BingoBookEntry,CareerRecord,CombatStats,EquipmentInventoryItem,JutsuTechnique,RogueProfile,StatKey,TrainingProfile,VillageDirectoryEntry,VillageId,VillageProfile,WorldEvent,WorldEventParticipation} from '../types';

const missionRanks=['D','C','B','A','S'] as const;
const stat=(value:number)=>Number.isFinite(value)?Math.round(value):0;

function VillageCard({entry}:{entry:VillageDirectoryEntry}){
  const village=VILLAGES[entry.village_id];
  return <Link to={`/villages/${entry.village_id}`} className="village-card">
    <span className="village-symbol">{village.symbol}</span>
    <div><small>{village.terrain}</small><h3>{village.label}</h3><p>{village.tagline}</p></div>
    <div className="village-card-stats"><b>Lv {entry.village_level}</b><span>{entry.member_count} members</span><span>{entry.total_reputation} rep</span></div>
  </Link>;
}

export function VillagesPage(){
  const [entries,setEntries]=useState<VillageDirectoryEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;listVillageDirectory().then(data=>live&&setEntries(data)).catch(e=>live&&setError(errorMessage(e,'Could not load the village directory.'))).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);
  const ranked=useMemo(()=>[...entries].sort((a,b)=>b.standing_score-a.standing_score),[entries]);
  return <div className="screen village-directory page-enter"><PageHeader eyebrow="V11 · LIVING VILLAGES" title="Five villages. One living world." description="Every shinobi can formally join a village. Missions, reputation, and career progression now contribute to village standing."/>{error&&<Feedback error={error}/>}<div className="village-summary-grid"><div><strong>{loading?'—':entries.reduce((n,v)=>n+v.member_count,0)}</strong><span>ACTIVE MEMBERS</span></div><div><strong>{loading?'—':entries.reduce((n,v)=>n+v.completed_missions,0)}</strong><span>MISSIONS COMPLETED</span></div><div><strong>{loading?'—':entries.reduce((n,v)=>n+v.total_reputation,0)}</strong><span>TOTAL REPUTATION</span></div></div><section className="world-section"><SectionHeader eyebrow="VILLAGE STANDINGS" title="Current Shinobi Nations"/><div className="village-grid">{ranked.map(entry=><VillageCard key={entry.village_id} entry={entry}/>)}</div></section></div>;
}

export function VillagePage(){
  const {villageId=''}=useParams();
  const {user}=useAuth();
  const {activeCharacterId,profile}=useActiveShinobi();
  const [data,setData]=useState<VillageProfile|null>(null);
  const [careerVillage,setCareerVillage]=useState<VillageId|null>(null);
  const [loading,setLoading]=useState(true);
  const action=useAsyncAction('Could not update village membership.');
  const valid=villageId in VILLAGES?villageId as VillageId:null;
  const load=async()=>{if(!valid)return;const [village,career]=await Promise.all([getVillageProfile(valid),activeCharacterId?getCareerRecord(activeCharacterId):Promise.resolve(null)]);setData(village);setCareerVillage(career?.village_id??null)};
  useEffect(()=>{let live=true;setLoading(true);if(!valid){setLoading(false);return}Promise.all([getVillageProfile(valid),activeCharacterId?getCareerRecord(activeCharacterId):Promise.resolve(null)]).then(([value,career])=>{if(live){setData(value);setCareerVillage(career?.village_id??null)}}).finally(()=>live&&setLoading(false));return()=>{live=false}},[valid,activeCharacterId]);
  if(!valid)return <div className="screen"><h2>Village not found</h2><Link className="btn secondary" to="/villages">Back to villages</Link></div>;
  const village=VILLAGES[valid],joined=careerVillage===valid;
  const join=()=>action.run(async()=>{if(!user||!activeCharacterId)throw new Error('Sign in and select an active shinobi first.');await joinVillage(activeCharacterId,valid);await load()},{success:`${profile.name} joined ${village.label}.`});
  const leave=()=>action.run(async()=>{if(!activeCharacterId)throw new Error('Select an active shinobi first.');await leaveVillage(activeCharacterId);await load()},{success:`${profile.name} left ${village.label}.`});
  return <div className="screen village-page page-enter"><PageHeader eyebrow="V11 · VILLAGE" title={village.label} description={`${village.tagline} ${village.terrain}.`} actions={<Link className="btn ghost" to="/villages">All Villages</Link>}/><Feedback error={action.error} notice={action.notice}/><div className="village-hero"><span>{village.symbol}</span><div><strong>Village Level {data?.summary.village_level??1}</strong><p>{data?.summary.member_count??0} members · {data?.summary.total_reputation??0} reputation · {data?.summary.completed_missions??0} missions</p></div>{user&&activeCharacterId&&(joined?<button className="btn ghost" disabled={action.busy} onClick={leave}>Leave Village</button>:<button className="btn primary" disabled={action.busy} onClick={join}>Join {village.label}</button>)}</div><section className="world-section"><SectionHeader eyebrow="PUBLIC ROSTER" title="Village Shinobi" meta={`${data?.summary.public_members??0} public`}/>{loading?<p className="muted">Loading village roster…</p>:data?.members.length?<div className="village-roster">{data.members.map(member=><Link to={`/shinobi/${member.character.public_slug}`} key={member.character.id}><div className="mini-avatar">{member.character.portrait_url?<img src={member.character.portrait_url} alt=""/>:village.symbol}</div><div><strong>{member.character.shinobi_alias||member.character.name}</strong><span>{member.title||'Village Shinobi'} · Lv {member.level}</span></div><em>{member.reputation} rep</em></Link>)}</div>:<EmptyMessage>No public members yet.</EmptyMessage>}</section></div>;
}

export function CareerPage(){
  const {user}=useAuth();
  const {activeCharacterId,profile}=useActiveShinobi();
  const [career,setCareer]=useState<CareerRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;setLoading(true);if(!user||!activeCharacterId){setCareer(null);setLoading(false);return}getCareerRecord(activeCharacterId).then(value=>live&&setCareer(value)).catch(e=>live&&setError(errorMessage(e,'Could not load career record.'))).finally(()=>live&&setLoading(false));return()=>{live=false}},[user,activeCharacterId]);
  if(!user)return <div className="screen"><PageHeader eyebrow="V11 · SHINOBI CAREER" title="Career records live in your cloud archive." description="Sign in to track field rank, mission history, village reputation, and long-term progression."/><Link className="btn primary" to="/login">Sign In</Link></div>;
  if(!activeCharacterId)return <div className="screen"><PageHeader eyebrow="V11 · SHINOBI CAREER" title="Select an active shinobi." description="Career progression is tracked separately for every saved character."/><Link className="btn primary" to="/account">Choose Shinobi</Link></div>;
  if(loading)return <div className="screen"><p className="muted">Loading career record…</p></div>;
  if(error)return <div className="screen"><Feedback error={error}/></div>;
  if(!career)return <div className="screen"><EmptyMessage>No career record found yet.</EmptyMessage></div>;
  const missionCounts=[career.d_missions,career.c_missions,career.b_missions,career.a_missions,career.s_missions];
  return <div className="screen career-page page-enter"><PageHeader eyebrow="V11 · SHINOBI CAREER" title={`${profile.name}'s Career Record`} description="Your field history now lives as a persistent career: rank, village service, mission outcomes, and milestones all progress together."/><div className="career-hero"><div><span>FIELD RANK</span><strong>{career.operational_rank}</strong><small>{career.current_title}</small></div><div><span>LEVEL</span><strong>{career.level}</strong><small>{career.xp} XP</small></div><div><span>VILLAGE</span><strong>{career.village_id?VILLAGES[career.village_id].label:'Independent'}</strong><small>{career.village_reputation} reputation</small></div><div><span>SUCCESS RATE</span><strong>{career.success_rate}%</strong><small>{career.mission_successes} successful missions</small></div></div><section className="career-section"><SectionHeader eyebrow="CAREER PROGRESSION" title="Field Advancement"/><div className="career-progress"><div><strong>{career.operational_rank}</strong><span>{career.next_milestone}</span></div><ProgressBar value={Math.min(100,career.level/40*100)}/></div></section><section className="career-section"><SectionHeader eyebrow="MISSION RECORD" title="Completed Operations" meta={`${career.completed_missions} completed`}/><div className="mission-rank-record">{missionRanks.map((rank,i)=><div key={rank}><span>{rank}-RANK</span><strong>{missionCounts[i]}</strong></div>)}</div><div className="career-outcomes"><div><strong>{career.mission_successes}</strong><span>SUCCESS</span></div><div><strong>{career.mission_failures}</strong><span>FAILED</span></div><div><strong>{career.mission_abandoned}</strong><span>ABANDONED</span></div></div></section>{career.village_id&&<section className="career-section"><SectionHeader eyebrow="VILLAGE SERVICE" title={VILLAGES[career.village_id].label}/><p className="lede">Your missions and reputation now contribute directly to your village's standing in the Shinobi World.</p><div className="actions"><Link className="btn secondary" to={`/villages/${career.village_id}`}>Open Village</Link></div></section>}</div>;
}


export function TrainingPage(){
  const {user}=useAuth();
  const {activeCharacterId,profile,stats}=useActiveShinobi();
  const [training,setTraining]=useState<TrainingProfile|null>(null);
  const [equipment,setEquipment]=useState<EquipmentInventoryItem[]>([]);
  const [trainingDrill,setTrainingDrill]=useState<StatKey|null>(null);
  const action=useAsyncAction('Training action failed.');
  const load=async()=>{if(!activeCharacterId)return;const [t,e]=await Promise.all([getTrainingProfile(activeCharacterId),listEquipment(activeCharacterId)]);setTraining(t);setEquipment(e)};
  useEffect(()=>{void load().catch(e=>action.setError(errorMessage(e,'Could not load training profile.')))},[activeCharacterId,user?.id]);
  if(!user)return <div className="screen"><PageHeader eyebrow="V11 · PHASE 2 · TRAINING" title="Training belongs to your cloud career." description="Sign in to spend mission-earned training points and improve a saved shinobi."/><Link className="btn primary" to="/login">Sign In</Link></div>;
  if(!activeCharacterId)return <div className="screen"><PageHeader eyebrow="V11 · PHASE 2 · TRAINING" title="Select an active shinobi." description="Each character develops their own trained stat bonuses, jutsu mastery, and equipment build."/><Link className="btn primary" to="/account">Choose Shinobi</Link></div>;
  const gear=equipmentBonuses(equipment);
  const keys=Object.keys(stats) as StatKey[];
  const train=(key:StatKey)=>setTrainingDrill(key);
  return <div className="screen training-page page-enter">{trainingDrill&&<ActivityChallenge kind="training" title={`${statLabels[trainingDrill]} Training Drill`} difficulty={55+(training?.bonuses[trainingDrill]||0)*2} focus="Successful execution converts your training point into permanent growth. Elite scores can convert two points at once." onCancel={()=>setTrainingDrill(null)} onComplete={async(result:ActivityResult)=>{const key=trainingDrill;setTrainingDrill(null);if(!key)return;if(!result.passed){action.setError(`${statLabels[key]} drill failed at ${result.score}. No training points were spent.`);return;}const available=training?.training_points??0;const amount=result.score>=90&&available>=2&&(training?.bonuses[key]||0)<=13?2:1;await action.run(()=>trainStat(activeCharacterId,key,amount),{after:load,success:`${statLabels[key]} drill scored ${result.score}. +${amount} permanent training.`})}}/>}<PageHeader eyebrow="V11 · PHASE 2 · TRAINING" title={`${profile.name}'s Training Grounds`} description="Missions now fund character development. Spend training points on permanent stat specialization and use ryō to build your field loadout."/><Feedback error={action.error} notice={action.notice}/><div className="training-wallet"><div><span>TRAINING POINTS</span><strong>{training?.training_points??0}</strong><small>Earned from missions</small></div><div><span>RYŌ</span><strong>{training?.ryo??0}</strong><small>Spend in the Arsenal</small></div><div><span>TRAINED BONUS</span><strong>+{training?.total_bonus??0}</strong><small>Across all stats</small></div><div><span>EQUIPPED GEAR</span><strong>{equipment.filter(e=>e.equipped).length}</strong><small>Active loadout pieces</small></div></div><section className="box"><SectionHeader eyebrow="STAT TRAINING" title="Specialize Your Shinobi" meta="1 TP = +1 permanent stat"/><div className="training-grid">{keys.map(key=>{const base=stats[key],trained=training?.bonuses[key]||0,gearBonus=gear[key]||0,effective=Math.min(100,base+trained+gearBonus);return <article className="training-stat" key={key}><div><strong>{statLabels[key]}</strong><span>Base {base} · Training +{trained} · Gear +{gearBonus}</span></div><div className="stat-track"><i style={{width:`${effective}%`}}/></div><div className="training-stat-actions"><b>{effective}</b><button className="btn secondary" disabled={action.busy||(training?.training_points??0)<1||trained>=15||effective>=100} onClick={()=>void train(key)}>{trained>=15?'Training Cap':'Train · 1 TP'}</button></div></article>})}</div></section><section className="box"><SectionHeader eyebrow="BUILD PROGRESSION" title="What Phase 2 Changes"/><div className="phase-links"><Link className="btn secondary" to="/arsenal">Master Jutsu & Equipment</Link><Link className="btn secondary" to="/missions">Earn More Resources</Link><Link className="btn secondary" to="/career">View Career Record</Link></div><p className="muted">Training bonuses are permanent for this shinobi. Equipment bonuses only apply while the item is equipped. Jutsu mastery is trained separately inside the Arsenal.</p></section></div>;
}


const WORLD_EVENT_POWER:Record<string,number>={D:48,C:58,B:68,A:79,S:90};
const WORLD_EVENT_HP:Record<string,number>={D:88,C:102,B:118,A:142,S:170};
function worldEventOpponent(event:WorldEvent):CombatOpponent{
  const rank=event.difficulty;
  if(event.event_type==='summoning_outbreak')return {name:'Rampaging Great Summon',style:'Massive Battlefield Threat',detail:event.description,power:WORLD_EVENT_POWER[rank]+5,affinity:'pressure',hp:WORLD_EVENT_HP[rank]+28,chakra:125,technique:'Cataclysmic Chakra Surge',boss:true};
  if(event.event_type==='invasion')return {name:'Enemy Vanguard Commander',style:'Frontline Commander',detail:event.description,power:WORLD_EVENT_POWER[rank]+3,affinity:'adaptive',hp:WORLD_EVENT_HP[rank]+16,chakra:120,technique:'Vanguard Secret Art',boss:true};
  return {name:'Wanted Missing-nin',style:'Bingo Book Target',detail:event.description,power:WORLD_EVENT_POWER[rank]+4,affinity:'control',hp:WORLD_EVENT_HP[rank]+12,chakra:120,technique:'Forbidden Rogue Technique',boss:rank==='A'||rank==='S'};
}
function bingoOpponent(entry:BingoBookEntry):CombatOpponent{
  const base={D:50,C:60,B:70,A:82,S:94}[entry.threat_class];
  return {name:entry.name,style:`${entry.threat_class}-Class ${entry.rogue_title}`,detail:`${entry.clan||'Unknown clan'} · ${entry.chakra_primary||'unknown'} chakra · ${entry.bounty.toLocaleString()} Ryō bounty`,power:Math.min(105,base+Math.min(10,entry.notoriety/120)),affinity:entry.threat_class==='S'||entry.threat_class==='A'?'adaptive':'control',hp:Math.round(90+base*.55),chakra:Math.round(90+base*.35),technique:`${entry.chakra_primary||'Forbidden'} Rogue Art`,boss:entry.threat_class==='A'||entry.threat_class==='S'};
}

const EVENT_LABELS:Record<string,string>={invasion:'Village Invasion',rogue_hunt:'Rogue Hunt',disaster:'Disaster Response',scroll_theft:'Forbidden Scroll Theft',border_conflict:'Border Conflict',summoning_outbreak:'Summoning Outbreak'};

export function WorldEventsPage(){
  const {user}=useAuth();
  const {activeCharacterId,profile,stats}=useActiveShinobi();
  const [events,setEvents]=useState<WorldEvent[]>([]);const [history,setHistory]=useState<WorldEventParticipation[]>([]);const [rogue,setRogue]=useState<RogueProfile|null>(null);const [eventPlay,setEventPlay]=useState<WorldEvent|null>(null);
  const [combatStats,setCombatStats]=useState<CombatStats>(stats);const [jutsu,setJutsu]=useState<JutsuTechnique[]>([]);
  const action=useAsyncAction('World-event action failed.');
  const load=async()=>{
    const active=await listActiveWorldEvents();setEvents(active);
    if(activeCharacterId){const [runs,r,training,equipment,techniques]=await Promise.all([listMyWorldEventParticipation(activeCharacterId),getRogueProfile(activeCharacterId),getTrainingProfile(activeCharacterId),listEquipment(activeCharacterId),user?listJutsu(user.id,activeCharacterId):Promise.resolve([])]);setHistory(runs);setRogue(r);setCombatStats(effectiveCombatStats(stats,training,equipment));setJutsu(techniques)}else{setHistory([]);setRogue(null);setCombatStats(stats);setJutsu([])}
  };
  useEffect(()=>{void load().catch(e=>action.setError(errorMessage(e,'Could not load the Shinobi World.')))},[activeCharacterId,user?.id,stats]);
  const participated=new Set(history.map(item=>item.event_id));
  const commitEvent=async(event:WorldEvent,score:number)=>{await action.run(()=>{if(!user||!activeCharacterId)throw new Error('Sign in and select an active shinobi first.');return participateWorldEvent(event.id,activeCharacterId)},{after:load,success:`${profile.name} cleared ${event.title} with ${score} field execution.`})};
  const combatEvent=eventPlay&&['rogue_hunt','invasion','summoning_outbreak'].includes(eventPlay.event_type);
  return <div className="screen world-events-page page-enter">
   {eventPlay&&combatEvent&&<CombatEncounter title={eventPlay.title} opponent={worldEventOpponent(eventPlay)} stats={combatStats} jutsu={jutsu} difficulty={{D:48,C:58,B:70,A:82,S:94}[eventPlay.difficulty]} onCancel={()=>setEventPlay(null)} onComplete={async(result:CombatResult)=>{const event=eventPlay;setEventPlay(null);if(!result.won){action.setError(`${event.title} pushed ${profile.name} out of the operation after ${result.rounds} combat rounds.`);return;}await commitEvent(event,result.score)}}/>}
   {eventPlay&&!combatEvent&&<ActivityChallenge kind="world" title={eventPlay.title} difficulty={{D:42,C:52,B:64,A:76,S:88}[eventPlay.difficulty]} focus="Clear the incident field drills before your shinobi can commit to the world operation." onCancel={()=>setEventPlay(null)} onComplete={async(result:ActivityResult)=>{const event=eventPlay;setEventPlay(null);if(!result.passed){action.setError(`World operation failed during field execution (${result.score}).`);return;}await commitEvent(event,result.score)}}/>}
   <PageHeader eyebrow="V11 · PHASE 4 · WORLD EVENTS" title="The Shinobi World is moving." description="Global incidents now mix field mini-games with full boss encounters. Rogue hunts, invasions, and summoning outbreaks use your real combat build."/><Feedback error={action.error} notice={action.notice}/><div className="world-event-status"><div><span>ALLEGIANCE</span><strong>{rogue?'ROGUE SHINOBI':'FIELD SHINOBI'}</strong><small>{rogue?`${rogue.threat_class}-Class · ${rogue.notoriety} notoriety`:'Village and independent operations'}</small></div><div><span>ACTIVE EVENTS</span><strong>{events.length}</strong><small>Limited-time world operations</small></div><div><span>PARTICIPATED</span><strong>{history.length}</strong><small>Career event record</small></div></div><section className="world-section"><SectionHeader eyebrow="ACTIVE INCIDENTS" title="World Operations"/>{events.length?<div className="world-event-grid">{events.map(event=>{const done=participated.has(event.id);const battle=['rogue_hunt','invasion','summoning_outbreak'].includes(event.event_type);return <article className="world-event-card" key={event.id}><div className="world-event-card-head"><span className={`rank-badge rank-${event.difficulty.toLowerCase()}`}>{event.difficulty}</span><div><small>{EVENT_LABELS[event.event_type]||event.event_type}{battle?' · COMBAT':''}</small><h3>{event.title}</h3></div></div><p>{event.description}</p><div className="world-event-meta"><span>{event.target_village?`Target: ${event.target_village}`:'Global incident'}</span><span>{event.participants} participants</span><span>{event.total_contribution} contribution</span></div><button className="btn primary" disabled={action.busy||done||!user||!activeCharacterId} onClick={()=>setEventPlay(event)}>{done?'Operation Complete':battle?'Enter Boss Encounter':'Enter Operation'}</button></article>})}</div>:<EmptyMessage>No active world events right now.</EmptyMessage>}</section>{history.length>0&&<section className="world-section"><SectionHeader eyebrow="FIELD HISTORY" title="World Event Record"/><div className="event-history">{history.map(item=><div key={item.id}><span>{item.success?'SUCCESS':'PARTIAL'}</span><strong>Score {item.score}</strong><em>+{item.contribution} contribution · {item.allegiance}</em></div>)}</div></section>}
  </div>;
}

export function RoguePathPage(){
  const {user}=useAuth();
  const {activeCharacterId,profile}=useActiveShinobi();
  const [career,setCareer]=useState<CareerRecord|null>(null);
  const [rogue,setRogue]=useState<RogueProfile|null>(null);
  const action=useAsyncAction('Could not update rogue status.');
  const load=async()=>{if(!activeCharacterId){setCareer(null);setRogue(null);return}const [c,r]=await Promise.all([getCareerRecord(activeCharacterId),getRogueProfile(activeCharacterId)]);setCareer(c);setRogue(r)};
  useEffect(()=>{void load().catch(e=>action.setError(errorMessage(e,'Could not load rogue career status.')))},[activeCharacterId,user?.id]);
  if(!user)return <div className="screen"><PageHeader eyebrow="V11 · ROGUE PATH" title="The rogue path belongs to your cloud career." description="Sign in to let a developed shinobi abandon village allegiance and enter the Bingo Book."/><Link className="btn primary" to="/login">Sign In</Link></div>;
  if(!activeCharacterId)return <div className="screen"><PageHeader eyebrow="V11 · ROGUE PATH" title="Select an active shinobi." description="Rogue status is tracked separately for each saved character."/><Link className="btn primary" to="/account">Choose Shinobi</Link></div>;
  const eligible=(career?.level??0)>=8&&(career?.completed_missions??0)>=5;
  const defect=()=>action.run(()=>becomeRogue(activeCharacterId),{after:load,success:`${profile.name} is now classified as missing-nin.`});
  const renounce=()=>action.run(()=>renounceRogueStatus(activeCharacterId),{after:load,success:`${profile.name} renounced rogue status and is now independent.`});
  return <div className="screen rogue-path-page page-enter"><PageHeader eyebrow="V11 · PHASE 4 · ROGUE SHINOBI" title={`${profile.name}'s Allegiance`} description="Village service is no longer permanent. Experienced shinobi can defect, build notoriety through world events, and climb the public Bingo Book."/><Feedback error={action.error} notice={action.notice}/>{rogue?<><div className="rogue-hero"><div><span>THREAT CLASS</span><strong>{rogue.threat_class}</strong><small>{rogue.rogue_title}</small></div><div><span>BOUNTY</span><strong>{rogue.bounty.toLocaleString()} Ryō</strong><small>Public threat value</small></div><div><span>NOTORIETY</span><strong>{rogue.notoriety}</strong><small>Grows through rogue operations</small></div><div><span>LAST VILLAGE</span><strong>{rogue.last_known_village||'Unknown'}</strong><small>Defected {new Date(rogue.rogue_since).toLocaleDateString()}</small></div></div><section className="box"><SectionHeader eyebrow="MISSING-NIN STATUS" title="Life Outside the Villages"/><p className="lede">Rogue shinobi earn notoriety instead of village reputation from world events. Higher notoriety raises threat class and bounty, making the character more prominent in the public Bingo Book.</p><div className="actions"><Link className="btn secondary" to="/world">Find Rogue Operations</Link><Link className="btn secondary" to="/bingo-book">Open Bingo Book</Link><button className="btn ghost" disabled={action.busy} onClick={()=>void renounce()}>Renounce Rogue Status</button></div></section></>:<><div className="rogue-entry-card"><span className="rogue-mark">抜</span><div><h3>Become Missing-nin</h3><p>Defecting removes your current village membership. Your career remains intact, but world-event rewards shift from village reputation toward notoriety and bounty.</p><strong>{eligible?'Eligible to defect':`Requires Level 8 + 5 completed missions · Current: Lv ${career?.level??1}, ${career?.completed_missions??0} missions`}</strong></div><button className="btn danger" disabled={!eligible||action.busy} onClick={()=>void defect()}>Abandon Village</button></div><p className="muted">Rejoining any village later automatically clears rogue status, but your prior public history may remain part of your Chronicle.</p></>}</div>;
}

export function BingoBookPage(){
  const {user}=useAuth();const {activeCharacterId,profile,stats}=useActiveShinobi();
  const [entries,setEntries]=useState<BingoBookEntry[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [hunt,setHunt]=useState<BingoBookEntry|null>(null);const [combatStats,setCombatStats]=useState<CombatStats>(stats);const [jutsu,setJutsu]=useState<JutsuTechnique[]>([]);
  useEffect(()=>{let live=true;Promise.all([listPublicBingoBook(40),activeCharacterId?getTrainingProfile(activeCharacterId):Promise.resolve(null),activeCharacterId?listEquipment(activeCharacterId):Promise.resolve([]),user&&activeCharacterId?listJutsu(user.id,activeCharacterId):Promise.resolve([])]).then(([rows,training,equipment,techniques])=>{if(!live)return;setEntries(rows);setCombatStats(activeCharacterId?effectiveCombatStats(stats,training,equipment):stats);setJutsu(techniques)}).catch(e=>live&&setError(errorMessage(e,'Could not load the Bingo Book.'))).finally(()=>live&&setLoading(false));return()=>{live=false}},[user?.id,activeCharacterId,stats]);
  return <div className="screen bingo-book-page page-enter">
    {hunt&&<CombatEncounter title={`Bingo Book Hunt · ${hunt.name}`} opponent={bingoOpponent(hunt)} stats={combatStats} jutsu={jutsu} difficulty={{D:52,C:62,B:72,A:84,S:96}[hunt.threat_class]} onCancel={()=>setHunt(null)} onComplete={(result:CombatResult)=>{const target=hunt;setHunt(null);if(result.won)setNotice(`${profile.name} defeated ${target.name} in ${result.rounds} rounds with a combat score of ${result.score}.`);else setError(`${target.name} escaped the hunt after defeating ${profile.name}.`)}}/>}
    <PageHeader eyebrow="V11 · PHASE 4 · BINGO BOOK" title="Known Missing-nin" description="Published rogue shinobi can now be challenged directly. Their threat class, notoriety, and bounty scale the tactical encounter."/>{error&&<Feedback error={error}/>} {notice&&<Feedback notice={notice}/>}<section className="world-section">{loading?<p className="muted">Loading classified records…</p>:entries.length?<div className="public-bingo-grid">{entries.map(entry=><article className="bingo-card" key={entry.character_id}><div className={`bingo-threat threat-${String(entry.threat_class||'D').toLowerCase()}`}>{entry.threat_class||'D'}</div><div className="mini-avatar">{entry.portrait_url?<img loading="lazy" decoding="async" src={entry.portrait_url} alt=""/>:'忍'}</div><div><small>{entry.rogue_title}</small><h3><Link to={`/shinobi/${entry.public_slug}`}>{entry.name}</Link></h3><p>{entry.clan||'Unknown clan'} · {entry.chakra_primary||'Unknown chakra'}</p><strong>{Number(entry.bounty||0).toLocaleString()} Ryō bounty</strong><span>{entry.notoriety} notoriety{entry.last_known_village?` · formerly ${entry.last_known_village}`:''}</span><div className="public-actions"><Link className="btn secondary" to={`/shinobi/${entry.public_slug}`}>View Dossier</Link><button className="btn primary" disabled={!user||!activeCharacterId||entry.character_id===activeCharacterId} onClick={()=>setHunt(entry)}>{entry.character_id===activeCharacterId?'Your Record':user&&activeCharacterId?'Hunt Target':'Sign In to Hunt'}</button></div></div></article>)}</div>:<EmptyMessage>No published rogue shinobi are currently listed.</EmptyMessage>}</section><p className="muted">Bingo Book hunts are interactive combat challenges. World-event rewards remain server-authoritative through active Rogue Hunt incidents.</p>
  </div>;
}

