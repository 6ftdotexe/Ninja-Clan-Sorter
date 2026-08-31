import {useEffect,useRef,useState} from 'react';
import {Navigate,useNavigate,useParams} from 'react-router-dom';
import {toPng} from 'html-to-image';
import {clans} from '../data/clans';
import {advancedTests,coreTests,testOrder,tests} from '../data/quizzes';
import {scoreAnswers,selectQuestions} from '../engine/scoring';
import {saveArchiveToCharacter} from '../features/characters';
import {loadActivePortrait} from '../features/generator';
import {useAuth} from '../contexts/AuthContext';
import {useArchive} from '../store/useArchive';
import {archiveRank,completion,earnedBadges} from '../utils/character';
import type {Question,TestDefinition,TestId,TestLength,TestResult} from '../types';
import {EmptyMessage,PageHeader,ProgressBar,SectionHeader} from '../lib/ui';

export function QuizPage(){const {testId}=useParams();const navigate=useNavigate();const setPending=useArchive(s=>s.setPending);if(!testId||!(testId in tests))return <Navigate to="/archive" replace/>;const id=testId as TestId;return <div className="page-enter"><QuizRunner test={tests[id]} onComplete={r=>{setPending(r);navigate(`/result/${id}`)}} onExit={()=>navigate('/archive')}/></div>}
export function ArchivePage(){const navigate=useNavigate();const {reset}=useArchive();return <div className="page-enter"><Dashboard onTest={id=>navigate(`/test/${id}`)} onDossier={()=>navigate('/dossier')} onGenerator={()=>navigate('/generator')} onArsenal={()=>navigate('/arsenal')} onMissions={()=>navigate('/missions')} onReset={()=>{reset();navigate('/')}}/></div>}
export function DossierPage(){const navigate=useNavigate();const results=useArchive(s=>s.results);if(!testOrder.every(id=>results[id]))return <Navigate to="/archive" replace/>;return <div className="page-enter"><Dossier onBack={()=>navigate('/archive')}/></div>}
export function ResultPage(){
  const {testId}=useParams();const navigate=useNavigate();const {user}=useAuth();const {pending,results,savePending,activeCharacterId}=useArchive();const [saveError,setSaveError]=useState('');
  if(!testId||!(testId in tests))return <Navigate to="/archive" replace/>;const id=testId as TestId;const result=pending?.testId===id?pending:results[id];if(!result)return <Navigate to={`/test/${id}`} replace/>;
  const archiveResult=async()=>{setSaveError('');if(pending?.testId===id)savePending();if(user&&activeCharacterId){try{const state=useArchive.getState();await saveArchiveToCharacter(user.id,activeCharacterId,state.name,state.results)}catch(error){setSaveError(error instanceof Error?`Saved locally, but cloud sync failed: ${error.message}`:'Saved locally, but cloud sync failed.');return}}navigate('/archive')};
  return <div className="page-enter">{saveError&&<div className="generator-error">{saveError}</div>}<ResultView test={tests[id]} result={result} onSave={()=>{void archiveResult()}} onRetake={()=>navigate(`/test/${id}`)} onArchive={()=>navigate('/archive')}/></div>;
}

export function Dashboard({onTest,onDossier,onGenerator,onArsenal,onMissions,onReset}:{onTest:(id:TestId)=>void,onDossier:()=>void,onGenerator:()=>void,onArsenal:()=>void,onMissions:()=>void,onReset:()=>void}){const {name,results,history}=useArchive();const prog=completion(results);const badges=earnedBadges(results);const clan=results.clan?tests.clan.outcomes[results.clan.winner]:undefined;const group=(title:string,ids:TestId[])=><section className="trial-section"><SectionHeader eyebrow={title==='Core Identity'?'FOUNDATION':'ADVANCED IDENTITY'} title={title} meta={`${ids.filter(id=>results[id]).length}/${ids.length}`}/><div className="test-grid">{ids.map((id,index)=>{const t=tests[id],r=results[id];return <article className={`test-card ${r?'complete':''}`} key={id} style={{animationDelay:`${index*35}ms`}}><div className="test-top"><span className="eyebrow">{t.icon} {t.shortLabel}</span><span className="status">{r?'COMPLETE':'NOT STARTED'}</span></div><h3>{t.label}</h3><p>{t.description}</p>{r&&<div className="test-result">{t.outcomes[r.winner]?.label}{r.secondary?` + ${r.secondary}`:''} · {r.confidence}%</div>}<button className="btn secondary" onClick={()=>onTest(id)}>{r?'Retake trial':'Take trial'}</button></article>})}</div></section>;return <div className="screen"><PageHeader eyebrow="IDENTITY ARCHIVE · V10" title={name||'Unnamed Shinobi'} description={`${prog.done} of ${prog.total} trials complete. Complete advanced trials to refine your rank, fighting style, team role, specialty, leadership, inherited potential, and weapon affinity.`}/><div className="profile-banner"><div className="avatar">{clan?.symbol||'忍'}</div><div><h3>{clan?`${clan.label} bloodline`:'Begin your archive'}</h3><p>Archive Rank · {archiveRank(prog.done)}</p></div><div className="level"><strong>{prog.percent}%</strong><ProgressBar value={Math.max(4,prog.percent)} className="xp"/></div></div><div className="badge-row">{badges.map(b=><div key={b.id} className={`badge ${b.earned?'earned':''}`}><b>{b.icon}</b><span>{b.label}</span></div>)}</div>{group('Core Identity',coreTests)}{group('Advanced Identity',advancedTests)}<div className="archive-grid"><div className="box"><h3>Master profile</h3><div className="master-grid">{testOrder.map(id=><div key={id}><span>{tests[id].shortLabel}</span><strong>{results[id]?tests[id].outcomes[results[id]!.winner]?.label:'Unknown'}</strong></div>)}</div><div className="master-actions"><button className="btn primary full" disabled={prog.done<6} onClick={onDossier}>{prog.done<6?`Complete ${6-prog.done} core trial${6-prog.done===1?'':'s'}`:prog.done===prog.total?'Open Complete Dossier':'Open Evolving Dossier'}</button><button className="btn secondary full" disabled={!results.clan||!results.village||!results.chakra} onClick={onGenerator}>✦ Generate AI Shinobi Portrait</button><button className="btn secondary full" disabled={!results.clan||!results.chakra} onClick={onArsenal}>⚔ Open Combat Stats & Jutsu</button><button className="btn secondary full" disabled={!results.clan||!results.village} onClick={onMissions}>任 Open Missions & Progression</button></div></div><div className="box"><h3>Recent archive history</h3>{history.length?history.slice(0,8).map((h,i)=><div className="history-row" key={`${h.date}-${i}`}><strong>{tests[h.testId].shortLabel}</strong><span>{tests[h.testId].outcomes[h.winner]?.label||h.winner}</span></div>):<EmptyMessage>No archived trials yet.</EmptyMessage>}<button className="btn ghost" onClick={onReset}>Reset archive</button></div></div></div>}

const lengthInfo: Record<TestLength, { label: string; detail: string; pace: string }> = {
  short: { label: 'Short', detail: 'Quick read', pace: '~2–4 min' },
  medium: { label: 'Medium', detail: 'Balanced accuracy', pace: '~5–8 min' },
  long: { label: 'Long', detail: 'Deepest result', pace: '~8–15 min' },
};

export function QuizRunner({ test, onComplete, onExit }: { test: TestDefinition; onComplete: (r: TestResult) => void; onExit: () => void }) {
  const [length, setLength] = useState<TestLength | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  const lengths = test.lengths ?? {
    short: Math.max(4, Math.ceil(test.questionCount * 0.45)),
    medium: Math.max(6, Math.ceil(test.questionCount * 0.72)),
    long: test.questionCount,
  };

  const start = (choice: TestLength) => {
    setLength(choice);
    setQuestions(selectQuestions(test, lengths[choice]));
    setIndex(0);
    setAnswers([]);
    setDirection('next');
  };

  if (!length) {
    return <div className="screen quiz length-select">
      <div className="quiz-head"><button className="back" onClick={onExit}>← Archive</button><span>Choose test depth</span></div>
      <div className="length-intro">
        <span className="eyebrow">{test.label}</span>
        <h2>How deep do you want to go?</h2>
        <p>{test.description}</p>
      </div>
      <div className="length-grid">
        {(['short', 'medium', 'long'] as TestLength[]).map((choice) => {
          const info = lengthInfo[choice];
          return <button key={choice} className={`length-card ${choice === 'medium' ? 'recommended' : ''}`} onClick={() => start(choice)}>
            {choice === 'medium' && <small>RECOMMENDED</small>}
            <strong>{info.label}</strong>
            <b>{lengths[choice]} questions</b>
            <span>{info.detail}</span>
            <em>{info.pace}</em>
          </button>;
        })}
      </div>
      <p className="length-note">Every mode uses a randomized set of distinct questions. Longer tests improve score stability and secondary-match accuracy.</p>
    </div>;
  }

  const q = questions[index];
  const choose = (pick: number) => {
    const next = [...answers];
    next[index] = pick;
    if (index === questions.length - 1) {
      const result = scoreAnswers(test, questions, next);
      result.meta = { ...(result.meta ?? {}), testLength: length, questionCount: questions.length };
      onComplete(result);
      return;
    }
    setAnswers(next);
    setDirection('next');
    setIndex(index + 1);
  };
  const back = () => {
    if (!index) {
      setLength(null);
      setQuestions([]);
      setAnswers([]);
      return;
    }
    setDirection('back');
    setIndex(index - 1);
  };

  return <div className="screen quiz"><div className="quiz-head"><button className="back" onClick={back}>← {index ? 'Back' : 'Length'}</button><span>{lengthInfo[length].label} · {index + 1} / {questions.length}</span></div><div className="progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><div key={q.id} className={`question-stage ${direction}`}><span className="eyebrow">{test.label} · {q.theme}</span><h2 className="question">{q.prompt}</h2><div className="answers">{q.answers.map((ans, i) => <button key={`${q.id}-${i}`} className={`answer ${answers[index] === i ? 'selected' : ''}`} onClick={() => choose(i)}><small>{String.fromCharCode(65 + i)}</small>{ans.text}</button>)}</div></div></div>;
}

export function ResultView({test,result,onSave,onRetake,onArchive}:{test:TestDefinition,result:TestResult,onSave:()=>void,onRetake:()=>void,onArchive:()=>void}){const out=test.outcomes[result.winner];return <div className="screen result"><div className="reveal"><div className="result-sigil reveal-pop">{out.symbol||test.icon}</div><span className="eyebrow">{result.confidence}% MATCH</span><h2>{out.label}</h2><p className="lede center">{out.description}</p></div>{result.secondary&&<div className="identity-grid"><div><span>Primary</span><strong>{result.winner}</strong></div><div><span>Secondary</span><strong>{result.secondary}</strong></div><div className="wide"><span>Advanced transformation</span><strong>{result.advanced}</strong></div></div>}{out.traits&&<div className="pill-row">{out.traits.map(t=><span className="pill" key={t}>{t}</span>)}</div>}{(out.strengths||out.weaknesses)&&<div className="identity-grid insight-grid">{out.strengths&&<div><span>Strengths</span><strong>{out.strengths.join(' · ')}</strong></div>}{out.weaknesses&&<div><span>Growth edges</span><strong>{out.weaknesses.join(' · ')}</strong></div>}</div>}<div className="box"><h3>Closest affinities</h3>{result.alternates.map(a=><div className="rankrow" key={a.id}><span>{test.outcomes[a.id]?.label||a.id}</span><div className="track"><i style={{width:`${a.percent}%`}}/></div><b>{a.percent}%</b></div>)}</div><div className="actions"><button className="btn primary" onClick={onSave}>Archive result</button><button className="btn secondary" onClick={onRetake}>Retake</button><button className="btn ghost" onClick={onArchive}>Back to archive</button></div></div>}

const buildLoadout=(results:Record<string,TestResult|undefined>)=>{const clan=results.clan?clans[results.clan.winner]:undefined;const primary=results.chakra?.winner||(results.clan?.meta?.chakra as string)||'Fire';const secondary=results.chakra?.secondary||'Wind';const role=(results.clan?.meta?.role as string)||'Tactician';const element:Record<string,[string,string]>={Fire:['Great Fire Burst','Phoenix Ember Volley'],Wind:['Vacuum Blade','Gale Step'],Lightning:['Lightning Fang','Flash Step'],Earth:['Earth Rampart','Stone Spear'],Water:['Water Dragon','Mist Veil']};const roleMove:Record<string,string>={Assault:'Body Flicker Assault',Guardian:'Barrier Guard',Support:'Chakra Transfer',Recon:'Silent Tracking',Tactician:'Shadow Feint'};return [{name:clan?.jutsu?.[0]||'Signature Technique',desc:`Clan specialty · ${clan?.specialty||'Adaptive combat'}`},{name:(element[primary]||element.Fire)[0],desc:`Primary ${primary} nature technique`},{name:(element[secondary]||element.Wind)[1],desc:`Secondary ${secondary} nature technique`},{name:roleMove[role]||'Clone Feint',desc:`Built for your ${role.toLowerCase()} combat profile`}];};
const archiveId=(name:string,clan:string,village:string)=>{const seed=[...name+clan+village].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),2166136261);return`SI-${seed.toString(16).toUpperCase().slice(0,8).padStart(8,'0')}`};
export function Dossier({onBack}:{onBack:()=>void}){const ref=useRef<HTMLDivElement>(null);const nav=useNavigate();const{name,results}=useArchive();const[portrait,setPortrait]=useState('');useEffect(()=>{loadActivePortrait().then(v=>v&&setPortrait(v)).catch(()=>{})},[]);const clan=results.clan!,village=results.village!,chakra=results.chakra!;const fields=[['Bloodline',tests.clan.outcomes[clan.winner]?.label||clan.winner],['Village',tests.village.outcomes[village.winner]?.label||village.winner],['Rank Projection',String(clan.meta?.rank||'Jōnin')],['Combat Role',String(clan.meta?.role||'Tactician')],['Chakra Natures',`${tests.chakra.outcomes[chakra.winner]?.label||chakra.winner} / ${chakra.secondary?(tests.chakra.outcomes[chakra.secondary]?.label||chakra.secondary):'None'}`],['Advanced Release',chakra.advanced||'None'],['Summoning',results.summon?(tests.summon.outcomes[results.summon.winner]?.label||results.summon.winner):'Unknown'],['Sensei Match',results.mentor?(tests.mentor.outcomes[results.mentor.winner]?.label||results.mentor.winner):'Unknown'],['Shadow Mirror',results.rogue?(tests.rogue.outcomes[results.rogue.winner]?.label||results.rogue.winner):'Unknown']] as [string,string][];const id=archiveId(name||'Unnamed Shinobi',clan.winner,village.winner);const save=async()=>{if(!ref.current)return;const url=await toPng(ref.current,{pixelRatio:2,cacheBust:true});const a=document.createElement('a');a.download=`${(name||'shinobi').replace(/[^a-z0-9]/gi,'-').toLowerCase()}-v10-dossier.png`;a.href=url;a.click()};return <div className="screen dossier"><div ref={ref} className={`dossier-paper ${portrait?'with-portrait':''}`}><span className="eyebrow">CONFIDENTIAL · SHINOBI RECORD · V10</span><div className="dossier-title"><div className="dossier-identity">{portrait&&<img className="dossier-portrait" src={portrait} alt="AI generated shinobi portrait"/>}<div><h2>{(name||'Unnamed Shinobi').toUpperCase()}</h2><p>{tests.clan.outcomes[clan.winner]?.label} · {tests.village.outcomes[village.winner]?.label||village.winner} · {String(clan.meta?.role||'Tactician')}</p></div></div><div className="result-sigil small">{tests.clan.outcomes[clan.winner]?.symbol}</div></div><div className="dossier-grid">{fields.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><h3>Recommended loadout</h3><div className="jutsu-grid">{buildLoadout(results).map((m,i)=><div className="jutsu-card" key={m.name}><span>SLOT {i+1}</span><b>{m.name}</b><p>{m.desc}</p></div>)}</div><div className="dossier-foot"><strong>{id}</strong><span>S-RANK POTENTIAL ASSESSMENT</span></div></div><div className="actions"><button className="btn primary" onClick={save}>Save dossier PNG</button><button className="btn secondary" onClick={()=>nav('/generator')}>{portrait?'Regenerate portrait':'Generate AI portrait'}</button><button className="btn ghost" onClick={onBack}>Back to archive</button></div></div>}
