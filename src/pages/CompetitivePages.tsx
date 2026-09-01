import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {advanceChuninExam,EXAM_STAGES,getActiveSeason,getCompetitiveRecord,getExamEntry,listCompetitiveLeaderboard,listMyExamHistory,registerForChuninExam} from '../features/competitive';
import {errorMessage,useActiveShinobi,useAsyncAction,Feedback} from '../lib/app';
import {EmptyMessage,PageHeader,ProgressBar,SectionHeader} from '../lib/ui';
import type {ChuninExamEntry,CompetitiveLeaderboardEntry,CompetitiveRecord,CompetitiveSeason} from '../types';

const score=(value:number|null)=>value==null?'—':String(value);
const stageIndex=(entry:ChuninExamEntry|null)=>entry?Math.max(0,EXAM_STAGES.findIndex(stage=>stage.id===entry.stage)):0;

export function ExamsPage(){
  const {user}=useAuth();
  const {activeCharacterId,profile}=useActiveShinobi();
  const [season,setSeason]=useState<CompetitiveSeason|null>(null);
  const [entry,setEntry]=useState<ChuninExamEntry|null>(null);
  const [record,setRecord]=useState<CompetitiveRecord|null>(null);
  const [history,setHistory]=useState<ChuninExamEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const action=useAsyncAction('Exam action failed.');
  const load=async()=>{
    setLoading(true);
    try{
      const active=await getActiveSeason();setSeason(active);
      if(activeCharacterId){const [current,competitive,past]=await Promise.all([getExamEntry(activeCharacterId),getCompetitiveRecord(activeCharacterId),listMyExamHistory(activeCharacterId)]);setEntry(current);setRecord(competitive);setHistory(past)}
    }finally{setLoading(false)}
  };
  useEffect(()=>{void load().catch(e=>action.setError(errorMessage(e,'Could not load Chūnin Exams.')))},[activeCharacterId,user?.id]);
  const register=()=>action.run(async()=>{if(!activeCharacterId)throw new Error('Select an active shinobi first.');await registerForChuninExam(activeCharacterId)},{after:load,success:'Chūnin Exam registration confirmed.'});
  const advance=()=>action.run(async()=>{if(!entry)throw new Error('Register for the exam first.');const result=await advanceChuninExam(entry.id);return result},{after:load,success:'Exam stage resolved.'});
  const progress=entry?.stage==='complete'?100:Math.max(5,(stageIndex(entry)+1)/EXAM_STAGES.length*100);
  if(!user)return <div className="screen"><PageHeader eyebrow="V11 · PHASE 3 · CHŪNIN EXAMS" title="Competitive exams require a cloud career." description="Sign in to register a shinobi, advance through exam stages, and earn seasonal standing."/><Link className="btn primary" to="/login">Sign In</Link></div>;
  if(!activeCharacterId)return <div className="screen"><PageHeader eyebrow="V11 · PHASE 3 · CHŪNIN EXAMS" title="Select an active shinobi." description="Each saved shinobi maintains an independent exam record and seasonal score."/><Link className="btn primary" to="/account">Choose Shinobi</Link></div>;
  return <div className="screen exam-page page-enter"><PageHeader eyebrow="V11 · PHASE 3 · CHŪNIN EXAMS" title={`${profile.name}'s Chūnin Exam`} description="A multi-stage competitive evaluation of career readiness, training, mission experience, and technique mastery." actions={<Link className="btn ghost" to="/seasons">Season Standings</Link>}/><Feedback error={action.error} notice={action.notice}/>{loading?<p className="muted">Loading exam record…</p>:<>
    <div className="exam-season-hero"><div><span>CURRENT SEASON</span><strong>{season?.name||'No active season'}</strong><small>{season?.theme||'Competition is currently between seasons.'}</small></div><div><span>SEASON POINTS</span><strong>{record?.season_points??0}</strong><small>{record?.best_finish||'No exam finish yet'}</small></div><div><span>EXAMS COMPLETED</span><strong>{record?.exams_completed??0}</strong><small>{record?.exam_wins??0} championships</small></div></div>
    {!entry&&season?<section className="box exam-registration"><SectionHeader eyebrow="REGISTRATION" title="Enter the Chūnin Exams"/><p className="lede">Registration requires an established career. The exam rewards mission history, training investment, and mastered techniques instead of relying on a single raw stat.</p><button className="btn primary" disabled={action.busy} onClick={()=>void register()}>Register {profile.name}</button></section>:entry&&<section className="box"><SectionHeader eyebrow="ACTIVE EXAM" title={entry.status==='completed'?'Exam Complete':entry.status==='eliminated'?'Exam Eliminated':EXAM_STAGES.find(x=>x.id===entry.stage)?.label||'Chūnin Exam'} meta={entry.qualification||entry.status.toUpperCase()}/><ProgressBar value={progress}/><div className="exam-stage-grid">{EXAM_STAGES.map((stage,index)=>{const values=[entry.tactical_score,entry.survival_score,entry.preliminary_score,entry.final_score];const done=values[index]!=null;const active=entry.stage===stage.id;return <article className={`exam-stage ${active?'active':''} ${done?'done':''}`} key={stage.id}><span>STAGE {index+1}</span><h3>{stage.label}</h3><p>{stage.description}</p><strong>{score(values[index])}</strong></article>})}</div>{entry.status==='active'||entry.status==='registered'?<button className="btn primary" disabled={action.busy} onClick={()=>void advance()}>{entry.status==='registered'?'Begin Tactical Examination':'Resolve Current Stage'}</button>:<p className="lede">{entry.status==='completed'?`Final qualification: ${entry.qualification||'Completed'}.`:'This exam run has ended. Your earned season points remain on your competitive record.'}</p>}</section>}
    <section className="box"><SectionHeader eyebrow="EXAM HISTORY" title="Competitive Record" meta={`${history.length} entries`}/>{history.length?<div className="exam-history">{history.map(item=><article key={item.id}><div><strong>{item.qualification||item.status}</strong><span>{new Date(item.created_at).toLocaleDateString()} · {item.total_score} total score</span></div><div><b>{score(item.tactical_score)}</b><b>{score(item.survival_score)}</b><b>{score(item.preliminary_score)}</b><b>{score(item.final_score)}</b></div></article>)}</div>:<EmptyMessage>No exam history yet.</EmptyMessage>}</section>
  </>}</div>;
}

export function SeasonsPage(){
  const [season,setSeason]=useState<CompetitiveSeason|null>(null);
  const [leaders,setLeaders]=useState<CompetitiveLeaderboardEntry[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;Promise.all([getActiveSeason(),listCompetitiveLeaderboard(30)]).then(([s,l])=>{if(live){setSeason(s);setLeaders(l)}}).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);
  const top=useMemo(()=>leaders.slice(0,3),[leaders]);
  return <div className="screen seasons-page page-enter"><PageHeader eyebrow="V11 · PHASE 3 · COMPETITIVE SEASONS" title={season?.name||'Shinobi Competitive Season'} description={season?.theme||'Seasonal standings connect Chūnin Exams to the wider Shinobi World.'} actions={<Link className="btn primary" to="/exams">Enter Chūnin Exams</Link>}/>{loading?<p className="muted">Loading season standings…</p>:<><div className="season-podium">{top.map((leader,index)=><article key={leader.character_id}><span>#{index+1}</span>{leader.portrait_url?<img src={leader.portrait_url} alt=""/>:<div className="mini-avatar">忍</div>}<strong>{leader.name}</strong><small>{leader.village||'Independent'}</small><b>{leader.season_points} pts</b></article>)}</div><section className="box"><SectionHeader eyebrow="SEASON LEADERBOARD" title="Current Standings" meta={`${leaders.length} ranked`}/>{leaders.length?<div className="season-table">{leaders.map((leader,index)=><div key={leader.character_id}><span>#{index+1}</span><div>{leader.public_slug?<Link to={`/shinobi/${leader.public_slug}`}>{leader.name}</Link>:<strong>{leader.name}</strong>}<small>{leader.village||'Independent'} · {leader.best_finish}</small></div><b>{leader.season_points}</b><em>{leader.exam_wins} wins</em></div>)}</div>:<EmptyMessage>No competitive results have been recorded yet.</EmptyMessage>}</section></>}</div>;
}
