import {useEffect,useState,type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {listCharacters} from '../features/characters';
import {deleteJutsu,generateTechnique,listJutsu,saveJutsu,setJutsuSlot} from '../features/arsenal';
import {EQUIPMENT_CATALOG,equipEquipment,equipmentSlotLabel,getTrainingProfile,listEquipment,purchaseEquipment,trainJutsuMastery} from '../features/training';
import {abandonMission,acceptMission,completeMission,generateMission,getProgression,listMissions,resolveMission} from '../features/missions';
import {addTimelineEvent,deleteTimelineEvent,generateLoreDraft,generateTimelineDraft,getLore,listTimeline,replaceTimeline,saveLore,updateCustomization} from '../features/lore';
import {statLabels} from '../utils/character';
import {levelFromXp,operationalRank,progressionAchievements,reputationTitle,xpForLevel,xpForNextLevel} from '../utils/character';
import type {CharacterLore,EquipmentInventoryItem,JutsuSlot,JutsuTechnique,ProfileTheme,ShinobiCharacter,ShinobiMission,ShinobiProgression,StatKey,TimelineEvent,TrainingProfile} from '../types';
import {Feedback,errorMessage,useActiveShinobi,useAsyncAction} from '../lib/app';
import {ActionRow,EmptyMessage,EmptyState,PageHeader,ProgressBar,SectionHeader} from '../lib/ui';

const slots:JutsuSlot[]=['standard','advanced','signature','ultimate','summoning'];
export function ArsenalPage(){
  const {user}=useAuth();
  const {name,activeCharacterId,profile,stats}=useActiveShinobi();
  const [jutsu,setJutsu]=useState<JutsuTechnique[]>([]);
  const [preview,setPreview]=useState<JutsuTechnique|null>(null);
  const [training,setTraining]=useState<TrainingProfile|null>(null);
  const [equipment,setEquipment]=useState<EquipmentInventoryItem[]>([]);
  const action=useAsyncAction('Could not update arsenal.');
  const refresh=async()=>{
    if(!user||!activeCharacterId)return;
    const [savedJutsu,trainingProfile,ownedEquipment]=await Promise.all([
      listJutsu(user.id,activeCharacterId),
      getTrainingProfile(activeCharacterId),
      listEquipment(activeCharacterId),
    ]);
    setJutsu(savedJutsu);setTraining(trainingProfile);setEquipment(ownedEquipment);
  };
  useEffect(()=>{void refresh().catch(e=>action.setError(errorMessage(e,'Could not load arsenal')))},[user?.id,activeCharacterId]);
  const generate=()=>setPreview(generateTechnique(profile,jutsu.length));
  const save=()=>{if(!preview||!user||!activeCharacterId)return;void action.run(async()=>{await saveJutsu(user.id,activeCharacterId,preview);setPreview(null)},{after:refresh,fallback:'Could not save technique'})};
  const train=(jutsuId:string)=>action.run(()=>trainJutsuMastery(jutsuId,1),{after:refresh,success:'Technique mastery increased.'});
  const purchase=(itemId:string)=>action.run(()=>purchaseEquipment(activeCharacterId!,itemId),{after:refresh,success:'Equipment added to inventory.'});
  const toggleEquip=(item:EquipmentInventoryItem)=>action.run(()=>equipEquipment(activeCharacterId!,item.id,!item.equipped),{after:refresh,success:item.equipped?'Equipment stowed.':'Equipment equipped.'});
  if(!activeCharacterId)return <EmptyState title="Open a shinobi first" description="V11 stats, jutsu mastery, and equipment belong to a specific saved shinobi." actionLabel="Open My Shinobi" actionTo="/account"/>;
  const ownedIds=new Set(equipment.map(item=>item.item_id));
  return <div className="screen arsenal-page page-enter">
    <PageHeader eyebrow="V11 · PHASE 2 · ARSENAL" title={`${name}'s Combat Archive`} description="Forge techniques, master saved jutsu, and build an equipment loadout using resources earned through missions and training."/>
    <Feedback error={action.error} notice={action.notice}/>
    <section className="box"><SectionHeader eyebrow="DERIVED PROFILE" title="Combat Stats" meta={`${profile.completion}% identity`}/><div className="stat-grid">{Object.entries(stats).map(([k,v])=><div className="stat-row" key={k}><span>{statLabels[k as keyof typeof statLabels]}</span><div className="stat-track"><i style={{width:`${v}%`}}/></div><strong>{v}</strong></div>)}</div></section>
    <section className="box"><SectionHeader eyebrow="TECHNIQUE FORGE" title="Generate Jutsu" action={<button className="btn primary" onClick={generate}>Generate Technique</button>}/>{preview?<article className="jutsu-card featured"><div className="jutsu-head"><div><span className="eyebrow">{preview.rank}-RANK · {preview.type}</span><h3>{preview.name}</h3></div><b>{preview.chakraNature}</b></div><p>{preview.description}</p><div className="jutsu-meta"><span>Range · {preview.range}</span><span>Role · {preview.role}</span><span>Cost · {preview.chakraCost}</span></div><div className="jutsu-columns"><div><strong>Strengths</strong>{preview.strengths.map(x=><span key={x}>+ {x}</span>)}</div><div><strong>Weaknesses</strong>{preview.weaknesses.map(x=><span key={x}>− {x}</span>)}</div></div><ActionRow><button className="btn primary" disabled={!user||action.busy} onClick={save}>{user?'Save to Shinobi':'Sign in to save'}</button><button className="btn ghost" onClick={generate}>Reroll</button></ActionRow></article>:<EmptyMessage>Generate a technique to preview it here.</EmptyMessage>}</section>
    <section className="box"><SectionHeader eyebrow="JUTSU MASTERY" title="Technique Loadout" meta={`${training?.training_points??0} training points`}/><div className="jutsu-grid">{jutsu.map(j=><article className="jutsu-card" key={j.id}><div className="jutsu-head"><div><span className="eyebrow">{j.rank}-RANK · {j.type}</span><h3>{j.name}</h3></div>{j.slot&&<b>{j.slot.toUpperCase()}</b>}</div><p>{j.description}</p><div className="jutsu-meta"><span>{j.chakraNature}</span><span>{j.range}</span><span>{j.chakraCost}</span></div><div className="mastery-line"><span>Mastery Lv. {j.masteryLevel}/5</span><ProgressBar value={j.masteryLevel>=5?100:Math.min(100,j.masteryXp%100)} /></div><ActionRow><label className="slot-select">Loadout <select value={j.slot||''} onChange={async e=>{if(!user||!activeCharacterId)return;await setJutsuSlot(j.id,user.id,activeCharacterId,(e.target.value||null) as JutsuSlot|null);await refresh()}}><option value="">Unequipped</option>{slots.map(slot=><option key={slot} value={slot}>{slot}</option>)}</select></label><button className="btn secondary" disabled={!user||action.busy||(training?.training_points??0)<2||j.masteryLevel>=5} onClick={()=>void train(j.id)}>{j.masteryLevel>=5?'Mastered':'Train · 2 TP'}</button></ActionRow><button className="mini-link danger" onClick={async()=>{if(!user)return;await deleteJutsu(j.id,user.id);await refresh()}}>Delete</button></article>)}{!jutsu.length&&<EmptyMessage>No saved techniques yet.</EmptyMessage>}</div></section>
    <section className="box"><SectionHeader eyebrow="EQUIPMENT" title="Field Loadout" meta={`${training?.ryo??0} ryō`}/><div className="equipment-owned">{equipment.map(entry=><article className={`equipment-card ${entry.equipped?'equipped':''}`} key={entry.id}><div><span className="eyebrow">{equipmentSlotLabel(entry.slot)}</span><h4>{entry.item.name}</h4><p>{entry.item.description}</p></div><div className="equipment-bonuses">{Object.entries(entry.item.bonuses).map(([key,value])=><span key={key}>+{value} {statLabels[key as keyof typeof statLabels]}</span>)}</div><button className={`btn ${entry.equipped?'secondary':'primary'}`} disabled={action.busy} onClick={()=>void toggleEquip(entry)}>{entry.equipped?'Stow':'Equip'}</button></article>)}{!equipment.length&&<EmptyMessage>No equipment owned yet. Purchase gear below with mission ryō.</EmptyMessage>}</div><SectionHeader eyebrow="SUPPLY CATALOG" title="Available Equipment"/><div className="equipment-catalog">{EQUIPMENT_CATALOG.map(item=><article className="equipment-card" key={item.id}><div><span className="eyebrow">{equipmentSlotLabel(item.slot)} · {item.price} RYŌ</span><h4>{item.name}</h4><p>{item.description}</p></div><div className="equipment-bonuses">{Object.entries(item.bonuses).map(([key,value])=><span key={key}>+{value} {statLabels[key as keyof typeof statLabels]}</span>)}</div><button className="btn secondary" disabled={action.busy||ownedIds.has(item.id)||(training?.ryo??0)<item.price} onClick={()=>void purchase(item.id)}>{ownedIds.has(item.id)?'Owned':`Purchase · ${item.price}`}</button></article>)}</div></section>
  </div>;
}

export function MissionsPage(){const nav=useNavigate();const {user}=useAuth();const {name,activeCharacterId,profile,stats}=useActiveShinobi();const [prog,setProg]=useState<ShinobiProgression|null>(null);const [missions,setMissions]=useState<ShinobiMission[]>([]);const [offer,setOffer]=useState<ShinobiMission|null>(null);const [training,setTraining]=useState<TrainingProfile|null>(null);const [equipment,setEquipment]=useState<EquipmentInventoryItem[]>([]);const action=useAsyncAction('Mission action failed');
 const refresh=async()=>{if(!user||!activeCharacterId)return;const[p,m,t,e]=await Promise.all([getProgression(user.id,activeCharacterId),listMissions(user.id,activeCharacterId),getTrainingProfile(activeCharacterId),listEquipment(activeCharacterId)]);setProg({...p,level:levelFromXp(p.xp)});setMissions(m);setTraining(t);setEquipment(e)};useEffect(()=>{void refresh().catch(e=>action.setError(errorMessage(e,'Could not load mission record')))},[user?.id,activeCharacterId]);
 if(!activeCharacterId)return <EmptyState title="Open a shinobi first" description="Missions and progression belong to a specific saved shinobi." actionLabel="Open My Shinobi" actionTo="/account"/>;
 if(!user)return <EmptyState title="Sign in to deploy" description="Mission progression is saved to your V11 account." actionLabel="Sign In" actionTo="/login"/>;
 const statKeys=Object.keys(stats) as StatKey[];const gearBonuses={} as Partial<typeof stats>;for(const item of equipment){if(!item.equipped)continue;for(const key of statKeys)gearBonuses[key]=(gearBonuses[key]||0)+(item.item.bonuses[key]||0)}const effectiveStats={...stats};for(const key of statKeys)effectiveStats[key]=Math.min(100,stats[key]+(training?.bonuses[key]||0)+(gearBonuses[key]||0));const buildBonus=statKeys.reduce((sum,key)=>sum+Math.max(0,effectiveStats[key]-stats[key]),0);
 const p=prog;const level=p?.level??1;const rank=p?operationalRank(p,profile):'Genin';const badges=p?progressionAchievements(p):[];const currentFloor=xpForLevel(level),next=xpForNextLevel(level),levelPct=Math.max(2,Math.min(100,Math.round(((p?.xp??0)-currentFloor)/Math.max(1,next-currentFloor)*100)));const active=missions.find((m:ShinobiMission)=>m.status==='accepted');const history=missions.filter((m:ShinobiMission)=>m.status==='completed'||m.status==='failed');
 const run=(fn:()=>Promise<void>)=>action.run(fn,{after:refresh});
 return <div className="screen missions-page page-enter"><PageHeader eyebrow="V11 · MISSIONS" title={`${name}'s Mission Command`} description="Deploy your active shinobi, earn XP, build village reputation, and progress through operational ranks."/><Feedback error={action.error}/>
 <section className="mission-summary"><div><span>LEVEL</span><strong>{level}</strong><small>{p?.xp??0} XP</small></div><div><span>OPERATIONAL RANK</span><strong>{rank}</strong><small>{profile.rankPotential||'Potential unknown'}</small></div><div><span>TRAINING / RYŌ</span><strong>{p?.training_points??0} TP</strong><small>{p?.ryo??0} ryō · +{buildBonus} build power</small></div><div><span>MISSIONS</span><strong>{p?.completed_missions??0}</strong><small>{p?.s_missions??0} S · {p?.a_missions??0} A · {p?.b_missions??0} B</small></div></section>
 <section className="box"><SectionHeader eyebrow="LEVEL PROGRESSION" title="Field Experience" meta={`${levelPct}% to Lv. ${level+1}`}/><ProgressBar value={levelPct} className="mission-xp"/><div className="badge-row">{badges.map(b=><div className={`badge ${b.earned?'earned':''}`} key={b.id} title={b.description}><b>{b.icon}</b><span>{b.label}</span></div>)}</div></section>
 <section className="box"><div className="section-title"><div><span className="eyebrow">MISSION BOARD</span><h3>{active?'Active Deployment':'Request Assignment'}</h3></div>{!active&&<button className="btn primary" onClick={()=>setOffer(generateMission(profile,effectiveStats,level,Date.now()))}>Generate Mission</button>}</div>{active?<MissionCard mission={active} action={<><button className="btn primary" disabled={action.busy} onClick={()=>run(async()=>{const r=resolveMission(active,profile,effectiveStats);await completeMission(user.id,active,r.outcome,r.success)})}>Resolve Mission</button><button className="btn ghost" disabled={action.busy} onClick={()=>run(()=>abandonMission(user.id,active.id))}>Abandon</button></>}/>:offer?<MissionCard mission={offer} action={<><button className="btn primary" disabled={action.busy} onClick={()=>run(async()=>{await acceptMission(user.id,activeCharacterId,offer);setOffer(null)})}>Accept Mission</button><button className="btn ghost" onClick={()=>setOffer(generateMission(profile,effectiveStats,level,Date.now()+Math.random()*99999))}>Reroll</button></>}/>:<EmptyMessage>Generate an assignment matched to your current level and identity profile.</EmptyMessage>}</section>
 <section className="box"><div className="section-title"><div><span className="eyebrow">FIELD RECORD</span><h3>Mission History</h3></div><span>{history.length} recorded</span></div><div className="mission-history">{history.map((m:ShinobiMission)=><article key={m.id}><b className={`mission-rank rank-${m.rank.toLowerCase()}`}>{m.rank}</b><div><strong>{m.title}</strong><span>{m.category} · {m.location}</span><p>{m.outcome||m.objective}</p></div><em className={m.status}>{m.status.toUpperCase()}</em></article>)}{!history.length&&<p className="muted">No completed missions yet.</p>}</div></section></div>}
function MissionCard({mission,action}:{mission:ShinobiMission;action:ReactNode}){return <article className="mission-card"><div className="mission-card-head"><b className={`mission-rank rank-${mission.rank.toLowerCase()}`}>{mission.rank}</b><div><span className="eyebrow">{mission.category.toUpperCase()} · {mission.location.toUpperCase()}</span><h3>{mission.title}</h3></div></div><p>{mission.briefing}</p><div className="mission-objective"><span>OBJECTIVE</span><strong>{mission.objective}</strong></div><div className="mission-traits">{mission.recommended_traits.map(x=><span key={x}>{x}</span>)}</div><div className="mission-rewards"><div><span>XP</span><b>+{mission.rewards.xp}</b></div><div><span>REPUTATION</span><b>+{mission.rewards.reputation}</b></div>{mission.rewards.trainingPoints!==undefined&&<div><span>TRAINING</span><b>+{mission.rewards.trainingPoints} TP</b></div>}{mission.rewards.ryo!==undefined&&<div><span>RYŌ</span><b>+{mission.rewards.ryo}</b></div>}{mission.rewards.badge&&<div><span>BADGE</span><b>{mission.rewards.badge}</b></div>}</div><div className="cloud-card-actions">{action}</div></article>}

const themes:ProfileTheme[]=['void','ember','storm','mist','forest','sand'];

export function ChroniclePage(){
  const {user}=useAuth(); const nav=useNavigate();
  const {activeCharacterId,profile,stats}=useActiveShinobi();
  const [character,setCharacter]=useState<ShinobiCharacter|null>(null);
  const [lore,setLore]=useState<CharacterLore|null>(null);
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const action=useAsyncAction('Chronicle action failed');
  const [alias,setAlias]=useState(''); const [title,setTitle]=useState(''); const [theme,setTheme]=useState<ProfileTheme>('void'); const [banner,setBanner]=useState(''); const [featured,setFeatured]=useState('');
  const [eventTitle,setEventTitle]=useState(''); const [eventDetail,setEventDetail]=useState('');

  const refresh=async()=>{
    if(!user||!activeCharacterId)return;
    const chars=await listCharacters(user.id); const c=chars.find(x=>x.id===activeCharacterId)||null; setCharacter(c);
    if(c){
      const [l,t]=await Promise.all([getLore(user.id,c.id),listTimeline(user.id,c.id)]); setLore(l); setTimeline(t);
      setAlias(c.shinobi_alias||''); setTitle(c.profile_title||''); setTheme((c.profile_theme as ProfileTheme)||'void'); setBanner(c.banner_url||''); setFeatured(c.featured_art_url||'');
    }
  };
  useEffect(()=>{void refresh().catch(e=>action.setError(errorMessage(e,'Could not load chronicle')))},[user?.id,activeCharacterId]);

  if(!user)return <div className="screen"><span className="eyebrow">V11 · CHRONICLE</span><h2>Sign in to build your chronicle</h2><p className="lede">Lore, timelines, titles, and profile customization are saved to your cloud shinobi.</p><button className="btn primary" onClick={()=>nav('/login')}>Sign In</button></div>;
  if(!activeCharacterId)return <div className="screen"><span className="eyebrow">V11 · CHRONICLE</span><h2>Open a shinobi first</h2><p className="lede">Choose a saved shinobi from your account before building a chronicle.</p><button className="btn primary" onClick={()=>nav('/account')}>Open Account</button></div>;

  const run=(fn:()=>Promise<void>,success?:string)=>action.run(fn,{success});
  const createLore=()=>run(async()=>{const draft=generateLoreDraft(profile,stats,user.id);const saved=await saveLore(draft);setLore(saved);if(!timeline.length){const created=await replaceTimeline(user.id,activeCharacterId,generateTimelineDraft(profile,user.id));setTimeline(created)}},'Chronicle generated from this shinobi identity.');
  const saveLoreFields=()=>run(async()=>{if(!lore)return;setLore(await saveLore(lore))},'Lore saved.');
  const saveCustom=()=>run(async()=>{await updateCustomization(user.id,activeCharacterId,{shinobi_alias:alias,profile_title:title,profile_theme:theme,banner_url:banner,featured_art_url:featured});await refresh()},'Profile customization saved.');
  const resetTimeline=()=>run(async()=>{const created=await replaceTimeline(user.id,activeCharacterId,generateTimelineDraft(profile,user.id));setTimeline(created)},'Timeline rebuilt from current identity.');
  const addEvent=()=>run(async()=>{if(!eventTitle.trim()||!eventDetail.trim())throw new Error('Add both an event title and detail.');const row=await addTimelineEvent(user.id,activeCharacterId,eventTitle,eventDetail,'custom',timeline.length?Math.max(...timeline.map(t=>t.event_order))+10:10);setTimeline(v=>[...v,row].sort((a,b)=>a.event_order-b.event_order));setEventTitle('');setEventDetail('')},'Timeline event added.');
  const removeEvent=(id:string)=>run(async()=>{await deleteTimelineEvent(user.id,id);setTimeline(v=>v.filter(x=>x.id!==id))},'Timeline event removed.');
  const strongest=(Object.entries(stats) as [string,number][]).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return <div className={`screen chronicle-page theme-${theme} page-enter`}>
    <div className="chronicle-banner" style={banner?{backgroundImage:`linear-gradient(90deg,rgba(4,7,12,.92),rgba(4,7,12,.35)),url(${banner})`}:undefined}>
      <div><span className="eyebrow">V11 · SHINOBI CHRONICLE</span><h2>{alias||character?.name||profile.name}</h2><p>{title||'Build the legend behind the identity.'}</p></div>
      {featured&&<img src={featured} alt="Featured shinobi artwork"/>}
    </div>
    <Feedback error={action.error} notice={action.notice}/>

    <section className="chronicle-section">
      <div className="section-head"><div><span className="eyebrow">PROFILE CUSTOMIZATION</span><h3>Archive Presentation</h3></div><button className="btn primary" onClick={saveCustom} disabled={action.busy}>Save Profile</button></div>
      <div className="customization-grid">
        <label>Shinobi Alias<input maxLength={60} value={alias} onChange={e=>setAlias(e.target.value)} placeholder="The Storm Fox"/></label>
        <label>Public Title<input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Elite Recon Operative"/></label>
        <label>Profile Theme<select value={theme} onChange={e=>setTheme(e.target.value as ProfileTheme)}>{themes.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}</select></label>
        <label>Banner Image URL<input value={banner} onChange={e=>setBanner(e.target.value)} placeholder="https://..."/></label>
        <label className="span-2">Featured Artwork URL<input value={featured} onChange={e=>setFeatured(e.target.value)} placeholder="Use a saved/generated image URL"/></label>
      </div>
    </section>

    <section className="chronicle-section">
      <div className="section-head"><div><span className="eyebrow">CHARACTER LORE</span><h3>Personal History</h3></div><div className="public-actions"><button className="btn secondary" onClick={createLore} disabled={action.busy}>{lore?'Regenerate Draft':'Generate Chronicle'}</button>{lore&&<button className="btn primary" onClick={saveLoreFields} disabled={action.busy}>Save Lore</button>}</div></div>
      {!lore?<div className="empty-cloud"><strong>No chronicle yet.</strong><span>Generate a profile-aware draft from this shinobi's current identity, stats, village, role, chakra, and rank potential.</span></div>:
      <div className="lore-editor-grid">
        {([
          ['origin_story','Origin Story'],['academy_history','Academy History'],['mentor_history','Mentor History'],['turning_point','Turning Point'],['current_objective','Current Objective'],['personality_summary','Personality Summary']
        ] as const).map(([key,label])=><label key={key}>{label}<textarea value={lore[key]} onChange={e=>setLore({...lore,[key]:e.target.value})}/></label>)}
      </div>}
    </section>

    <section className="chronicle-section bingo-book">
      <div className="section-head"><div><span className="eyebrow">BINGO BOOK</span><h3>Intelligence Entry</h3></div></div>
      <div className="bingo-grid">
        <div className="bingo-id">{character?.portrait_url?<img src={character.portrait_url} alt=""/>:<span>忍</span>}<strong>{lore?.bingo_alias||alias||profile.name}</strong><small>{lore?.threat_rating||profile.rankPotential||'Unrated'}</small></div>
        <div className="bingo-details"><p>{lore?.intelligence_notes||'Generate the chronicle to create an intelligence summary.'}</p><div className="bingo-stats">{strongest.map(([key,value])=><div key={key}><span>{statLabels[key as keyof typeof statLabels]}</span><strong>{value}</strong></div>)}</div></div>
      </div>
      {lore&&<div className="bingo-fields"><label>Bingo Alias<input value={lore.bingo_alias} onChange={e=>setLore({...lore,bingo_alias:e.target.value})}/></label><label>Threat Rating<input value={lore.threat_rating} onChange={e=>setLore({...lore,threat_rating:e.target.value})}/></label><label className="span-2">Intelligence Notes<textarea value={lore.intelligence_notes} onChange={e=>setLore({...lore,intelligence_notes:e.target.value})}/></label></div>}
    </section>

    <section className="chronicle-section">
      <div className="section-head"><div><span className="eyebrow">TIMELINE</span><h3>Recorded History</h3></div><button className="btn secondary" onClick={resetTimeline} disabled={action.busy}>Rebuild Base Timeline</button></div>
      <div className="timeline-list">{timeline.map((event,index)=><article key={event.id}><div className="timeline-marker">{index+1}</div><div><small>{event.event_type.toUpperCase()}</small><h4>{event.title}</h4><p>{event.detail}</p></div><button className="mini-link danger" onClick={()=>removeEvent(event.id)} disabled={action.busy}>Remove</button></article>)}{!timeline.length&&<p className="muted">No timeline events yet.</p>}</div>
      <div className="timeline-add"><input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="Custom event title"/><textarea value={eventDetail} onChange={e=>setEventDetail(e.target.value)} placeholder="What happened?"/><button className="btn primary" onClick={addEvent} disabled={action.busy}>Add Event</button></div>
    </section>
  </div>;
}
