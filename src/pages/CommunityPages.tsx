import {memo,useCallback,useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {tests} from '../data/quizzes';
import {getPublicProfileBundle,getWorldStats,listPublicCharacterPage,type WorldStatItem,type WorldStats} from '../features/characters';
import type {CharacterLore,ShinobiCharacter,TimelineEvent} from '../types';
import {errorMessage} from '../lib/app';
import {EmptyMessage,PageHeader,SectionHeader} from '../lib/ui';

const initialStats: WorldStats = { public_count:0, complete_count:0, clans:[], villages:[], chakra:[], ranks:[], summons:[] };
function label(testId: keyof typeof tests, value: string | null) { return value ? tests[testId]?.outcomes[value]?.label || value : 'Unknown'; }
const StatList=memo(function StatList({title,items}:{title:string;items:WorldStatItem[]}) { const max=Math.max(1,...items.map(i=>i.count)); return <div className="world-stat"><h3>{title}</h3>{items.length ? items.slice(0,6).map(item=><div className="world-row" key={item.label}><div><strong>{item.label}</strong><span>{item.count}</span></div><div className="world-bar"><i style={{width:`${Math.max(7,item.count/max*100)}%`}} /></div></div>) : <EmptyMessage>No public data yet.</EmptyMessage>}</div>; });

export function DiscoverPage(){
  const [characters,setCharacters]=useState<ShinobiCharacter[]>([]);
  const [stats,setStats]=useState<WorldStats>(initialStats);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const [cursor,setCursor]=useState<{before:string|null;id:string|null}>({before:null,id:null});
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;Promise.all([listPublicCharacterPage(12),getWorldStats()]).then(([page,s])=>{if(!live)return;setCharacters(page.items);setHasMore(page.hasMore);setCursor({before:page.nextBefore,id:page.nextBeforeId});setStats(s)}).catch(e=>live&&setError(errorMessage(e,'Could not load the Shinobi World.'))).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);
  const loadMore=useCallback(async()=>{if(loadingMore||!hasMore)return;setLoadingMore(true);setError('');try{const page=await listPublicCharacterPage(12,cursor.before,cursor.id);setCharacters(current=>{const ids=new Set(current.map(c=>c.id));return [...current,...page.items.filter(c=>!ids.has(c.id))]});setHasMore(page.hasMore);setCursor({before:page.nextBefore,id:page.nextBeforeId})}catch(e){setError(errorMessage(e,'Could not load more shinobi.'))}finally{setLoadingMore(false)}},[cursor.before,cursor.id,hasMore,loadingMore]);
  return <div className="screen discover-page page-enter"><PageHeader className="discover-head" eyebrow="V10 · SHINOBI WORLD" title="Discover the Archive" description="Explore public identities and see how the community is distributed across clans, villages, chakra natures, ranks, and summons." actions={<Link className="btn primary" to="/archive">Build Your Identity</Link>}/>{error&&<div className="generator-error">{error}</div>}<div className="world-summary"><div><strong>{loading?'—':stats.public_count}</strong><span>PUBLIC SHINOBI</span></div><div><strong>{loading?'—':stats.complete_count}</strong><span>COMPLETE IDENTITIES</span></div><div><strong>{loading?'—':stats.clans.length}</strong><span>CLANS REPRESENTED</span></div><div><strong>{loading?'—':stats.villages.length}</strong><span>VILLAGES REPRESENTED</span></div></div><section className="world-section"><SectionHeader eyebrow="COMMUNITY DATA" title="Shinobi World Statistics"/><div className="world-stat-grid"><StatList title="Top Clans" items={stats.clans}/><StatList title="Top Villages" items={stats.villages}/><StatList title="Primary Chakra" items={stats.chakra}/><StatList title="Rank Distribution" items={stats.ranks}/><StatList title="Summoning Contracts" items={stats.summons}/></div></section><section className="world-section"><SectionHeader eyebrow="LATEST PUBLIC ARCHIVES" title="Meet the Shinobi" meta={characters.length}/><div className="public-card-grid">{characters.map(c=><Link to={`/shinobi/${c.public_slug}`} className="public-card" key={c.id}><div className="public-card-art">{c.portrait_url?<img loading="lazy" decoding="async" src={c.portrait_url} alt=""/>:<span>忍</span>}<em>{c.completion_percent}%</em></div><div><small>{label('village',c.village)}</small><h3>{c.name}</h3><p>{label('clan',c.clan)} · {label('rank',c.rank)}</p></div></Link>)}{!loading&&characters.length===0&&<div className="empty-cloud"><strong>No public shinobi yet.</strong><span>Publish one from your account to become the first.</span></div>}</div>{hasMore&&<div className="actions"><button className="btn secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading…':'Load more shinobi'}</button></div>}</section></div>;
}

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
    getPublicProfileBundle(slug)
      .then(bundle => {
        if(!live)return;
        setCharacter(bundle?.character??null);
        setLore(bundle?.lore??null);
        setTimeline(bundle?.timeline??[]);
      })
      .catch((e) => live && setError(errorMessage(e,'Could not load this shinobi.')))
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
      <div className="public-portrait">{character.portrait_url ? <img decoding="async" src={character.portrait_url} alt={`${character.name} shinobi portrait`} /> : <span>忍</span>}</div>
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
    {character.featured_art_url&&<section className="public-featured-art"><span className="eyebrow">FEATURED ARTWORK</span><img loading="lazy" decoding="async" src={character.featured_art_url} alt={`${displayName} featured artwork`}/></section>}
    {lore&&<section className="public-lore"><span className="eyebrow">CHRONICLE</span><h3>{lore.bingo_alias||displayName}</h3><p>{lore.origin_story}</p><div className="public-lore-grid"><div><span>Current Objective</span><p>{lore.current_objective}</p></div><div><span>Intelligence Summary</span><p>{lore.intelligence_notes}</p></div></div></section>}
    {timeline.length>0&&<section className="public-timeline"><span className="eyebrow">TIMELINE</span>{timeline.map((e,i)=><article key={e.id}><b>{i+1}</b><div><small>{e.event_type.toUpperCase()}</small><h4>{e.title}</h4><p>{e.detail}</p></div></article>)}</section>}
  </div>;
}
