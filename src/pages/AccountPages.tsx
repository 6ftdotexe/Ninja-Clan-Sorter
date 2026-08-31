import {useEffect,useState} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {useArchive} from '../store/useArchive';
import {copyShareUrl,createCharacter,deleteCharacter,listCharacters,loadCharacterArchive,migrateLocalArchive,publishCharacter,saveArchiveToCharacter,setActiveCharacter,unpublishCharacter,updateCharacterName,updatePublicBio} from '../features/characters';
import type {ShinobiCharacter} from '../types';
import {Feedback,errorMessage,useAsyncAction} from '../lib/app';
import {ActionRow,FormField,PageHeader,ProgressBar} from '../lib/ui';
import {runAccountIntegrityCheck,type IntegrityReport} from '../features/generator';

export function HomePage(){const navigate=useNavigate();const {name,setName}=useArchive();const [draft,setDraft]=useState(name);return <div className="hero page-enter"><span className="eyebrow">SHINOBI IDENTITY ARCHIVE · V10</span><h1>Discover, build, and share your shinobi identity.</h1><p className="lede">Build your identity, forge techniques, deploy on missions, gain XP, form teams, build a personal chronicle, and grow your shinobi inside a persistent archive.</p><div className="namebox"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Shinobi name (optional)"/><button className="btn primary" onClick={()=>{setName(draft.trim());navigate('/archive')}}>Enter archive</button><button className="btn secondary" onClick={()=>navigate('/discover')}>Explore World</button></div><div className="meta"><div><strong>13</strong><span>IDENTITY TRIALS</span></div><div><strong>16</strong><span>CLANS</span></div><div><strong>∞</strong><span>PROFILE COMBOS</span></div><div><strong>AI</strong><span>CHARACTER ART</span></div><div><strong>V10</strong><span>LIVING ARCHIVE</span></div></div></div>}

function AuthShell({mode}:{mode:'login'|'signup'}){
  const {user,configured,signIn,signUp}=useAuth();
  const navigate=useNavigate();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  if(user)return <Navigate to="/account" replace/>;
  const submit=async()=>{setBusy(true);setError('');const message=mode==='login'?await signIn(email,password):await signUp(email,password);setBusy(false);if(message){setError(message);return;}if(mode==='login')navigate('/account');else setError('Account created. Check your email if confirmation is enabled, then sign in.')};
  if(!configured)return <div className="screen page-enter"><span className="eyebrow">CLOUD ARCHIVE</span><h2>Accounts are not configured</h2><p className="lede">Add the Supabase browser environment variables described in SETUP.md.</p></div>;
  const login=mode==='login';
  return <div className="screen auth-page page-enter"><span className="eyebrow">{login?'RETURNING SHINOBI':'NEW ARCHIVE'}</span><h2>{login?'Sign in':'Create account'}</h2><p className="lede">{login?'Open your saved shinobi identities and cloud archive.':'Create a cloud archive for multiple shinobi profiles and progression.'}</p>{error&&<div className={error.startsWith('Account created')?'generator-notice':'generator-error'}>{error}</div>}<div className="auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={login?'current-password':'new-password'}/></label><button className="btn primary" disabled={busy||!email||password.length<6} onClick={()=>void submit()}>{busy?'Working…':login?'Sign In':'Create Account'}</button></div><p className="muted">{login?'Need an account? ':'Already have an account? '}<Link to={login?'/signup':'/login'}>{login?'Create one':'Sign in'}</Link></p></div>;
}
export function LoginPage(){return <AuthShell mode="login"/>}
export function SignupPage(){return <AuthShell mode="signup"/>}

export function AccountPage(){
  const {user,loading,configured,signOut}=useAuth();
  const nav=useNavigate();
  const {name,results,activeCharacterId,loadCharacter,setName}=useArchive();
  const [characters,setCharacters]=useState<ShinobiCharacter[]>([]);
  const action=useAsyncAction('Account action failed');
  const [bioDrafts,setBioDrafts]=useState<Record<string,string>>({});
  const [nameDrafts,setNameDrafts]=useState<Record<string,string>>({});
  const [integrity,setIntegrity]=useState<IntegrityReport|null>(null);

  const refresh=async()=>{
    if(!user)return;
    try{
      const next=await listCharacters(user.id);
      setCharacters(next);
      setBioDrafts(Object.fromEntries(next.map(c=>[c.id,c.bio||''])));
      setNameDrafts(Object.fromEntries(next.map(c=>[c.id,c.name])));
    }catch(e){
      action.setError(errorMessage(e,'Could not load characters'));
    }
  };

  useEffect(()=>{void refresh()},[user?.id]);
  if(loading)return <div className="screen"><p className="muted">Loading account…</p></div>;
  if(!configured)return <div className="screen"><h2>Cloud accounts need setup</h2><p className="lede">Add your Supabase public URL and publishable key to enable cloud accounts.</p></div>;
  if(!user){nav('/login',{replace:true,state:{from:'/account'}});return null;}

  const localCount=Object.keys(results).length;
  const run=(task:()=>Promise<void>,success?:string)=>action.run(task,{after:refresh,success});

  const migrate=()=>run(async()=>{
    const c=await migrateLocalArchive(user.id,name,results);
    await setActiveCharacter(c.id);
    loadCharacter(c.id,name||c.name,results);
  },'Local archive imported and opened.');

  const add=()=>run(async()=>{
    const c=await createCharacter(user.id,`Shinobi ${characters.length+1}`);
    await setActiveCharacter(c.id);
    loadCharacter(c.id,c.name,{});
  },'New shinobi created and opened.');

  const save=(c:ShinobiCharacter)=>run(async()=>{
    await saveArchiveToCharacter(user.id,c.id,name,results);
  },`Saved current results to ${c.name}.`);

  const open=(c:ShinobiCharacter)=>run(async()=>{
    const loaded=await loadCharacterArchive(user.id,c.id);
    await setActiveCharacter(c.id);
    loadCharacter(c.id,loaded.character.name,loaded.results);
    nav('/archive');
  },`${c.name} opened.`);

  const rename=(c:ShinobiCharacter)=>run(async()=>{
    const updated=await updateCharacterName(user.id,c.id,nameDrafts[c.id]||'');
    if(activeCharacterId===c.id)setName(updated.name);
  },`Shinobi renamed.`);

  const togglePublic=(c:ShinobiCharacter)=>run(async()=>{
    if(c.is_public)await unpublishCharacter(c.id,user.id);
    else await publishCharacter(c,bioDrafts[c.id]||'');
  },`${c.name} is now ${c.is_public?'private':'public'}.`);

  const makeActive=(c:ShinobiCharacter)=>run(async()=>{await setActiveCharacter(c.id)},`${c.name} is now your active shinobi. Use Open Shinobi to load its saved tests.`);

  const saveBio=(c:ShinobiCharacter)=>run(async()=>{await updatePublicBio(c.id,user.id,bioDrafts[c.id]||'')},'Public bio updated.');
  const share=(c:ShinobiCharacter)=>{if(!c.public_slug)return;void action.run(()=>copyShareUrl(c.public_slug!),{success:'Share link ready/copied.',fallback:'Could not share profile'})};
  const selfCheck=()=>void action.run(async()=>{const report=await runAccountIntegrityCheck(true);setIntegrity(report);await refresh();return report},{success:'Account self-check complete.',fallback:'Could not check account data'});

  return <div className="screen account-page page-enter">
    <PageHeader className="account-head" eyebrow="V10 · CLOUD ARCHIVE" title="Your Shinobi" description={user.email||''} actions={<div className="account-head-actions"><button className="btn secondary" onClick={()=>nav('/discover')}>Discover</button><button className="btn ghost" onClick={async()=>{await signOut();nav('/')}}>Sign out</button></div>}/>
    <Feedback error={action.error} notice={action.notice}/>
    <div className="account-actions"><button className="btn primary" onClick={add} disabled={action.busy}>+ New Shinobi</button><button className="btn secondary" onClick={selfCheck} disabled={action.busy}>Run account self-check</button>{localCount>0&&<button className="btn secondary" onClick={migrate} disabled={action.busy}>Import current local archive</button>}<button className="btn ghost" onClick={()=>nav('/archive')}>Back to tests</button></div>
    {integrity&&<div className={`integrity-card ${integrity.ok?'healthy':'needs-attention'}`}><div><span className="eyebrow">DATA INTEGRITY</span><h3>{integrity.ok?'Archive healthy':'Archive checked with notes'}</h3><p>{integrity.summary.characters} shinobi · {integrity.summary.missions} missions · {integrity.summary.generations} generations · {integrity.wallet.credits} credits</p></div>{integrity.issues.length?<ul>{integrity.issues.map(issue=><li key={issue.code}><strong>{issue.repaired?'Repaired':'Review'}:</strong> {issue.message}</li>)}</ul>:<p className="muted">No inconsistencies were detected.</p>}</div>}
    <div className="cloud-grid">{characters.map(c=><article className={`cloud-card ${c.is_active?'active-shinobi':''} ${activeCharacterId===c.id?'opened-shinobi':''}`} key={c.id}>
      <div className="cloud-avatar">{c.portrait_url?<img src={c.portrait_url} alt=""/>:<span>忍</span>}</div>
      <div><div className="cloud-flags"><small>{c.completion_percent}% COMPLETE</small>{c.is_active&&<span>ACTIVE</span>}{activeCharacterId===c.id&&<span>OPEN</span>}{c.is_public&&<span>PUBLIC</span>}</div><h3>{c.name}</h3><p>{[c.clan,c.village,c.chakra_primary].filter(Boolean).join(' · ')||'New identity'}</p><ProgressBar value={c.completion_percent}/></div>
      <div className="cloud-rename-editor"><FormField label="Shinobi name" count={`${(nameDrafts[c.id]||'').length}/60`}><span/></FormField><div className="cloud-inline-editor"><input maxLength={60} value={nameDrafts[c.id]||''} onChange={e=>setNameDrafts(v=>({...v,[c.id]:e.target.value}))}/><button className="mini-link" onClick={()=>rename(c)} disabled={action.busy||!(nameDrafts[c.id]||'').trim()}>Rename</button></div></div>
      <div className="cloud-public-editor"><FormField label="Public bio" count={`${(bioDrafts[c.id]||'').length}/280`}><span/></FormField><textarea maxLength={280} value={bioDrafts[c.id]||''} onChange={e=>setBioDrafts(v=>({...v,[c.id]:e.target.value}))} placeholder="Describe this shinobi for visitors…"/><button className="mini-link" onClick={()=>saveBio(c)} disabled={action.busy}>Save bio</button></div>
      <ActionRow><button className="btn primary" onClick={()=>open(c)} disabled={action.busy}>{activeCharacterId===c.id?'Reload Saved Tests':'Open Shinobi'}</button>{activeCharacterId===c.id&&<button className="btn secondary" onClick={()=>nav('/arsenal')} disabled={action.busy}>Combat Arsenal</button>}{activeCharacterId===c.id&&<button className="btn secondary" onClick={()=>nav('/chronicle')} disabled={action.busy}>Chronicle</button>}<button className="btn secondary" onClick={()=>save(c)} disabled={action.busy}>Save current results</button>{!c.is_active&&<button className="btn ghost" onClick={()=>makeActive(c)} disabled={action.busy}>Set Active</button>}<button className="btn ghost" onClick={()=>togglePublic(c)} disabled={action.busy}>{c.is_public?'Make Private':'Publish Profile'}</button>{c.is_public&&c.public_slug&&<><button className="btn ghost" onClick={()=>nav(`/shinobi/${c.public_slug}`)}>View Public</button><button className="btn ghost" onClick={()=>share(c)}>Share</button></>}<button className="btn ghost danger" onClick={()=>{if(confirm(`Delete ${c.name}?`))void run(async()=>{await deleteCharacter(c.id)})}}>Delete</button></ActionRow>
    </article>)}{characters.length===0&&<div className="empty-cloud"><strong>No cloud shinobi yet.</strong><span>Create one or import your current local archive.</span></div>}</div>
  </div>;
}
