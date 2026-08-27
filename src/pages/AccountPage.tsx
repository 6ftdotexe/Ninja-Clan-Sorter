import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {useArchive} from '../store/useArchive';
import {createCharacter,deleteCharacter,listCharacters,migrateLocalArchive,saveArchiveToCharacter,type ShinobiCharacter} from '../services/characterService';
import {copyShareUrl,publishCharacter,setActiveCharacter,unpublishCharacter,updatePublicBio} from '../services/publicProfileService';

export function AccountPage(){
  const {user,loading,configured,signOut}=useAuth();
  const nav=useNavigate();
  const {name,results}=useArchive();
  const [characters,setCharacters]=useState<ShinobiCharacter[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [bioDrafts,setBioDrafts]=useState<Record<string,string>>({});

  const refresh=async()=>{if(!user)return;try{const next=await listCharacters(user.id);setCharacters(next);setBioDrafts(Object.fromEntries(next.map(c=>[c.id,c.bio||''])))}catch(e){setError(e instanceof Error?e.message:'Could not load characters')}};
  useEffect(()=>{void refresh()},[user?.id]);
  if(loading)return <div className="screen"><p className="muted">Loading account…</p></div>;
  if(!configured)return <div className="screen"><h2>Cloud accounts need setup</h2><p className="lede">Add your Supabase public URL and publishable key to enable V9 accounts.</p></div>;
  if(!user){nav('/login',{replace:true,state:{from:'/account'}});return null;}

  const localCount=Object.keys(results).length;
  const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await task();await refresh()}catch(e){setError(e instanceof Error?e.message:'Account action failed')}finally{setBusy(false)}};
  const migrate=()=>run(async()=>{await migrateLocalArchive(user.id,name,results);setNotice('Local archive imported.')});
  const add=()=>run(async()=>{const c=await createCharacter(user.id,`Shinobi ${characters.length+1}`);if(characters.length===0)await setActiveCharacter(c.id);setNotice('New shinobi created.')});
  const save=(c:ShinobiCharacter)=>run(async()=>{await saveArchiveToCharacter(user.id,c.id,name,results);setNotice(`Saved current results to ${c.name}.`)});
  const togglePublic=(c:ShinobiCharacter)=>run(async()=>{if(c.is_public){await unpublishCharacter(c.id,user.id);setNotice(`${c.name} is now private.`)}else{await publishCharacter(c,bioDrafts[c.id]||'');setNotice(`${c.name} is now public.`)}});
  const makeActive=(c:ShinobiCharacter)=>run(async()=>{await setActiveCharacter(c.id);setNotice(`${c.name} is now your active shinobi.`)});
  const saveBio=(c:ShinobiCharacter)=>run(async()=>{await updatePublicBio(c.id,user.id,bioDrafts[c.id]||'');setNotice('Public bio updated.')});
  const share=async(c:ShinobiCharacter)=>{if(!c.public_slug)return;try{await copyShareUrl(c.public_slug);setNotice('Share link ready/copied.')}catch(e){setError(e instanceof Error?e.message:'Could not share profile')}};

  return <div className="screen account-page page-enter">
    <div className="account-head"><div><span className="eyebrow">V9 · PHASE 4 · CLOUD ARCHIVE</span><h2>Your Shinobi</h2><p>{user.email}</p></div><div className="account-head-actions"><button className="btn secondary" onClick={()=>nav('/discover')}>Discover</button><button className="btn ghost" onClick={async()=>{await signOut();nav('/')}}>Sign out</button></div></div>
    {error&&<div className="generator-error">{error}</div>}{notice&&<div className="generator-notice">{notice}</div>}
    <div className="account-actions"><button className="btn primary" onClick={add} disabled={busy}>+ New Shinobi</button>{localCount>0&&<button className="btn secondary" onClick={migrate} disabled={busy}>Import current local archive</button>}<button className="btn ghost" onClick={()=>nav('/archive')}>Back to tests</button></div>
    <div className="cloud-grid">{characters.map(c=><article className={`cloud-card ${c.is_active?'active-shinobi':''}`} key={c.id}>
      <div className="cloud-avatar">{c.portrait_url?<img src={c.portrait_url} alt=""/>:<span>忍</span>}</div>
      <div><div className="cloud-flags"><small>{c.completion_percent}% COMPLETE</small>{c.is_active&&<span>ACTIVE</span>}{c.is_public&&<span>PUBLIC</span>}</div><h3>{c.name}</h3><p>{[c.clan,c.village,c.chakra_primary].filter(Boolean).join(' · ')||'New identity'}</p><div className="progress"><i style={{width:`${c.completion_percent}%`}}/></div></div>
      <div className="cloud-public-editor"><label>Public bio <span>{(bioDrafts[c.id]||'').length}/280</span></label><textarea maxLength={280} value={bioDrafts[c.id]||''} onChange={e=>setBioDrafts(v=>({...v,[c.id]:e.target.value}))} placeholder="Describe this shinobi for visitors…"/><button className="mini-link" onClick={()=>saveBio(c)} disabled={busy}>Save bio</button></div>
      <div className="cloud-card-actions"><button className="btn secondary" onClick={()=>save(c)} disabled={busy}>Save current results</button>{!c.is_active&&<button className="btn ghost" onClick={()=>makeActive(c)} disabled={busy}>Set Active</button>}<button className="btn ghost" onClick={()=>togglePublic(c)} disabled={busy}>{c.is_public?'Make Private':'Publish Profile'}</button>{c.is_public&&c.public_slug&&<><button className="btn ghost" onClick={()=>nav(`/shinobi/${c.public_slug}`)}>View Public</button><button className="btn ghost" onClick={()=>share(c)}>Share</button></>}<button className="btn ghost danger" onClick={()=>{if(confirm(`Delete ${c.name}?`))void run(async()=>{await deleteCharacter(c.id)})}}>Delete</button></div>
    </article>)}{characters.length===0&&<div className="empty-cloud"><strong>No cloud shinobi yet.</strong><span>Create one or import your current local archive.</span></div>}</div>
  </div>;
}
