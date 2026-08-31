import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tests } from '../data/tests';
import { getPublicCharacter } from '../services/publicProfileService';
import {getPublicLore,getPublicTimeline} from '../services/loreService';
import type { ShinobiCharacter } from '../services/characterService';
import type {CharacterLore,TimelineEvent} from '../types/lore';

function outcomeLabel(testId: keyof typeof tests, value: string | null) {
  if (!value) return 'Unknown';
  return tests[testId]?.outcomes[value]?.label || value;
}

export function PublicProfilePage() {
  const { slug = '' } = useParams();
  const [character, setCharacter] = useState<ShinobiCharacter | null>(null);
  const [lore,setLore]=useState<CharacterLore|null>(null);
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    getPublicCharacter(slug)
      .then(async value => {
        if(!live)return;
        setCharacter(value);
        if(value){
          const [l,t]=await Promise.all([getPublicLore(value.id),getPublicTimeline(value.id)]);
          if(live){setLore(l);setTimeline(t)}
        }
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load this shinobi.'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [slug]);

  if (loading) return <div className="screen public-profile"><p className="muted">Opening public archive…</p></div>;
  if (error) return <div className="screen public-profile"><h2>Archive unavailable</h2><p className="lede">{error}</p><Link className="btn secondary" to="/discover">Browse the Shinobi World</Link></div>;
  if (!character) return <div className="screen public-profile"><span className="eyebrow">PUBLIC ARCHIVE</span><h2>Shinobi not found</h2><p className="lede">This profile may be private, unpublished, or no longer available.</p><Link className="btn secondary" to="/discover">Browse public profiles</Link></div>;

  const fields = [
    ['Bloodline', outcomeLabel('clan', character.clan)], ['Village', outcomeLabel('village', character.village)], ['Primary Chakra', outcomeLabel('chakra', character.chakra_primary)], ['Secondary Chakra', outcomeLabel('chakra', character.chakra_secondary)], ['Summoning', outcomeLabel('summon', character.summon)], ['Sensei Match', outcomeLabel('mentor', character.sensei)], ['Shadow Mirror', outcomeLabel('rogue', character.shadow_mirror)], ['Rank', outcomeLabel('rank', character.rank)], ['Team Role', outcomeLabel('teamRole', character.role)], ['Leadership', outcomeLabel('leadership', character.leadership)], ['Inherited Potential', outcomeLabel('inherited', character.inherited_trait)], ['Specialty', outcomeLabel('specialty', character.specialization)],
  ];

  const share = async () => { const url = window.location.href; if (navigator.share) { try { await navigator.share({ title: `${character.name} · Shinobi Identity`, url }); } catch {} } else { await navigator.clipboard.writeText(url); alert('Profile link copied.'); } };
  const theme=character.profile_theme||'void';
  const displayName=character.shinobi_alias||character.name;

  return <div className={`screen public-profile theme-${theme} page-enter`}>
    {character.banner_url&&<div className="public-banner" style={{backgroundImage:`linear-gradient(90deg,rgba(5,8,14,.9),rgba(5,8,14,.25)),url(${character.banner_url})`}}/>}
    <div className="public-hero">
      <div className="public-portrait">{character.portrait_url ? <img src={character.portrait_url} alt={`${character.name} shinobi portrait`} /> : <span>忍</span>}</div>
      <div className="public-identity">
        <span className="eyebrow">PUBLIC SHINOBI ARCHIVE · V10</span>
        <h2>{displayName}</h2>
        {character.shinobi_alias&&<small className="true-name">Archive name: {character.name}</small>}
        <p className="public-subtitle">{character.profile_title||[outcomeLabel('clan', character.clan), outcomeLabel('village', character.village), outcomeLabel('rank', character.rank)].filter(v => v !== 'Unknown').join(' · ')}</p>
        {character.bio && <p className="public-bio">{character.bio}</p>}
        <div className="public-progress"><div><strong>{character.completion_percent}%</strong><span>IDENTITY COMPLETE</span></div><div className="progress"><i style={{width:`${character.completion_percent}%`}} /></div></div>
        <div className="public-actions"><button className="btn primary" onClick={share}>Share Profile</button><Link className="btn secondary" to="/discover">Explore Shinobi World</Link><Link className="btn ghost" to="/">Build Yours</Link></div>
      </div>
    </div>
    <div className="public-field-grid">{fields.map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {character.featured_art_url&&<section className="public-featured-art"><span className="eyebrow">FEATURED ARTWORK</span><img src={character.featured_art_url} alt={`${displayName} featured artwork`}/></section>}
    {lore&&<section className="public-lore"><span className="eyebrow">CHRONICLE</span><h3>{lore.bingo_alias||displayName}</h3><p>{lore.origin_story}</p><div className="public-lore-grid"><div><span>Current Objective</span><p>{lore.current_objective}</p></div><div><span>Intelligence Summary</span><p>{lore.intelligence_notes}</p></div></div></section>}
    {timeline.length>0&&<section className="public-timeline"><span className="eyebrow">TIMELINE</span>{timeline.map((e,i)=><article key={e.id}><b>{i+1}</b><div><small>{e.event_type.toUpperCase()}</small><h4>{e.title}</h4><p>{e.detail}</p></div></article>)}</section>}
  </div>;
}
