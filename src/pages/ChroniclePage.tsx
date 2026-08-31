import {useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {useArchive} from '../store/useArchive';
import {deriveCombatStats,statLabels} from '../utils/combatStats';
import {normalizeProfile} from '../utils/characterProfile';
import {generateLoreDraft,generateTimelineDraft} from '../utils/loreGenerator';
import {addTimelineEvent,deleteTimelineEvent,getLore,listTimeline,replaceTimeline,saveLore,updateCustomization} from '../services/loreService';
import {listCharacters,type ShinobiCharacter} from '../services/characterService';
import type {CharacterLore,ProfileTheme,TimelineEvent} from '../types/lore';

const themes:ProfileTheme[]=['void','ember','storm','mist','forest','sand'];

export function ChroniclePage(){
  const {user}=useAuth(); const nav=useNavigate();
  const {name,results,activeCharacterId}=useArchive();
  const profile=useMemo(()=>normalizeProfile(name,activeCharacterId,results),[name,activeCharacterId,results]);
  const stats=useMemo(()=>deriveCombatStats(profile),[profile]);
  const [character,setCharacter]=useState<ShinobiCharacter|null>(null);
  const [lore,setLore]=useState<CharacterLore|null>(null);
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState(''); const [error,setError]=useState('');
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
  useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'Could not load chronicle'))},[user?.id,activeCharacterId]);

  if(!user)return <div className="screen"><span className="eyebrow">V10 · PHASE 4</span><h2>Sign in to build your chronicle</h2><p className="lede">Lore, timelines, titles, and profile customization are saved to your cloud shinobi.</p><button className="btn primary" onClick={()=>nav('/login')}>Sign In</button></div>;
  if(!activeCharacterId)return <div className="screen"><span className="eyebrow">V10 · PHASE 4</span><h2>Open a shinobi first</h2><p className="lede">Choose a saved shinobi from your account before building a chronicle.</p><button className="btn primary" onClick={()=>nav('/account')}>Open Account</button></div>;

  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Chronicle action failed')}finally{setBusy(false)}};
  const createLore=()=>run(async()=>{const draft=generateLoreDraft(profile,stats,user.id);const saved=await saveLore(draft);setLore(saved);if(!timeline.length){const created=await replaceTimeline(user.id,activeCharacterId,generateTimelineDraft(profile,user.id));setTimeline(created)}setNotice('Chronicle generated from this shinobi identity.')});
  const saveLoreFields=()=>run(async()=>{if(!lore)return;setLore(await saveLore(lore));setNotice('Lore saved.')});
  const saveCustom=()=>run(async()=>{await updateCustomization(user.id,activeCharacterId,{shinobi_alias:alias,profile_title:title,profile_theme:theme,banner_url:banner,featured_art_url:featured});await refresh();setNotice('Profile customization saved.')});
  const resetTimeline=()=>run(async()=>{const created=await replaceTimeline(user.id,activeCharacterId,generateTimelineDraft(profile,user.id));setTimeline(created);setNotice('Timeline rebuilt from current identity.')});
  const addEvent=()=>run(async()=>{if(!eventTitle.trim()||!eventDetail.trim())throw new Error('Add both an event title and detail.');const row=await addTimelineEvent(user.id,activeCharacterId,eventTitle,eventDetail,'custom',timeline.length?Math.max(...timeline.map(t=>t.event_order))+10:10);setTimeline(v=>[...v,row].sort((a,b)=>a.event_order-b.event_order));setEventTitle('');setEventDetail('');setNotice('Timeline event added.')});
  const removeEvent=(id:string)=>run(async()=>{await deleteTimelineEvent(user.id,id);setTimeline(v=>v.filter(x=>x.id!==id));setNotice('Timeline event removed.')});
  const strongest=Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return <div className={`screen chronicle-page theme-${theme} page-enter`}>
    <div className="chronicle-banner" style={banner?{backgroundImage:`linear-gradient(90deg,rgba(4,7,12,.92),rgba(4,7,12,.35)),url(${banner})`}:undefined}>
      <div><span className="eyebrow">V10 · PHASE 4 · SHINOBI CHRONICLE</span><h2>{alias||character?.name||profile.name}</h2><p>{title||'Build the legend behind the identity.'}</p></div>
      {featured&&<img src={featured} alt="Featured shinobi artwork"/>}
    </div>
    {error&&<div className="generator-error">{error}</div>}{notice&&<div className="generator-notice">{notice}</div>}

    <section className="chronicle-section">
      <div className="section-head"><div><span className="eyebrow">PROFILE CUSTOMIZATION</span><h3>Archive Presentation</h3></div><button className="btn primary" onClick={saveCustom} disabled={busy}>Save Profile</button></div>
      <div className="customization-grid">
        <label>Shinobi Alias<input maxLength={60} value={alias} onChange={e=>setAlias(e.target.value)} placeholder="The Storm Fox"/></label>
        <label>Public Title<input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Elite Recon Operative"/></label>
        <label>Profile Theme<select value={theme} onChange={e=>setTheme(e.target.value as ProfileTheme)}>{themes.map(t=><option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}</select></label>
        <label>Banner Image URL<input value={banner} onChange={e=>setBanner(e.target.value)} placeholder="https://..."/></label>
        <label className="span-2">Featured Artwork URL<input value={featured} onChange={e=>setFeatured(e.target.value)} placeholder="Use a saved/generated image URL"/></label>
      </div>
    </section>

    <section className="chronicle-section">
      <div className="section-head"><div><span className="eyebrow">CHARACTER LORE</span><h3>Personal History</h3></div><div className="public-actions"><button className="btn secondary" onClick={createLore} disabled={busy}>{lore?'Regenerate Draft':'Generate Chronicle'}</button>{lore&&<button className="btn primary" onClick={saveLoreFields} disabled={busy}>Save Lore</button>}</div></div>
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
      <div className="section-head"><div><span className="eyebrow">TIMELINE</span><h3>Recorded History</h3></div><button className="btn secondary" onClick={resetTimeline} disabled={busy}>Rebuild Base Timeline</button></div>
      <div className="timeline-list">{timeline.map((event,index)=><article key={event.id}><div className="timeline-marker">{index+1}</div><div><small>{event.event_type.toUpperCase()}</small><h4>{event.title}</h4><p>{event.detail}</p></div><button className="mini-link danger" onClick={()=>removeEvent(event.id)} disabled={busy}>Remove</button></article>)}{!timeline.length&&<p className="muted">No timeline events yet.</p>}</div>
      <div className="timeline-add"><input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="Custom event title"/><textarea value={eventDetail} onChange={e=>setEventDetail(e.target.value)} placeholder="What happened?"/><button className="btn primary" onClick={addEvent} disabled={busy}>Add Event</button></div>
    </section>
  </div>;
}
