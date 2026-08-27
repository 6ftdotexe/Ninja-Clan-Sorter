import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tests } from '../data/tests';
import { getPublicCharacter } from '../services/publicProfileService';
import type { ShinobiCharacter } from '../services/characterService';

function outcomeLabel(testId: keyof typeof tests, value: string | null) {
  if (!value) return 'Unknown';
  return tests[testId]?.outcomes[value]?.label || value;
}

export function PublicProfilePage() {
  const { slug = '' } = useParams();
  const [character, setCharacter] = useState<ShinobiCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    getPublicCharacter(slug)
      .then((value) => live && setCharacter(value))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load this shinobi.'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [slug]);

  if (loading) return <div className="screen public-profile"><p className="muted">Opening public archive…</p></div>;
  if (error) return <div className="screen public-profile"><h2>Archive unavailable</h2><p className="lede">{error}</p><Link className="btn secondary" to="/discover">Browse the Shinobi World</Link></div>;
  if (!character) return <div className="screen public-profile"><span className="eyebrow">PUBLIC ARCHIVE</span><h2>Shinobi not found</h2><p className="lede">This profile may be private, unpublished, or no longer available.</p><Link className="btn secondary" to="/discover">Browse public profiles</Link></div>;

  const fields = [
    ['Bloodline', outcomeLabel('clan', character.clan)],
    ['Village', outcomeLabel('village', character.village)],
    ['Primary Chakra', outcomeLabel('chakra', character.chakra_primary)],
    ['Secondary Chakra', outcomeLabel('chakra', character.chakra_secondary)],
    ['Summoning', outcomeLabel('summon', character.summon)],
    ['Sensei Match', outcomeLabel('mentor', character.sensei)],
    ['Shadow Mirror', outcomeLabel('rogue', character.shadow_mirror)],
    ['Rank', outcomeLabel('rank', character.rank)],
    ['Team Role', outcomeLabel('teamRole', character.role)],
    ['Leadership', outcomeLabel('leadership', character.leadership)],
    ['Inherited Potential', outcomeLabel('inherited', character.inherited_trait)],
    ['Specialty', outcomeLabel('specialty', character.specialization)],
  ];

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${character.name} · Shinobi Identity`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied.');
    }
  };

  return <div className="screen public-profile page-enter">
    <div className="public-hero">
      <div className="public-portrait">{character.portrait_url ? <img src={character.portrait_url} alt={`${character.name} shinobi portrait`} /> : <span>忍</span>}</div>
      <div className="public-identity">
        <span className="eyebrow">PUBLIC SHINOBI ARCHIVE · V9</span>
        <h2>{character.name}</h2>
        <p className="public-subtitle">{[outcomeLabel('clan', character.clan), outcomeLabel('village', character.village), outcomeLabel('rank', character.rank)].filter(v => v !== 'Unknown').join(' · ')}</p>
        {character.bio && <p className="public-bio">{character.bio}</p>}
        <div className="public-progress"><div><strong>{character.completion_percent}%</strong><span>IDENTITY COMPLETE</span></div><div className="progress"><i style={{width:`${character.completion_percent}%`}} /></div></div>
        <div className="public-actions"><button className="btn primary" onClick={share}>Share Profile</button><Link className="btn secondary" to="/discover">Explore Shinobi World</Link><Link className="btn ghost" to="/">Build Yours</Link></div>
      </div>
    </div>
    <div className="public-field-grid">{fields.map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
  </div>;
}
