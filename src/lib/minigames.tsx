import {useEffect,useMemo,useState} from 'react';

export type ActivityKind='mission'|'training'|'exam'|'world'|'team'|'war'|'mastery';
export type ActivityResult={score:number;passed:boolean;rounds:number[]};

type Props={
  kind:ActivityKind;
  title:string;
  difficulty?:number;
  focus?:string;
  onComplete:(result:ActivityResult)=>void|Promise<void>;
  onCancel:()=>void;
};

const SYMBOLS=['火','水','風','雷','土','忍','影','印'];
const TACTICS=[
  {q:'Your route is exposed and the objective is still ahead.',choices:['Rush the objective','Find cover and reassess','Abandon all equipment'],best:1},
  {q:'A teammate signals unexpected movement on the flank.',choices:['Ignore it','Split the squad blindly','Confirm the threat and reposition'],best:2},
  {q:'Your chakra output spikes during a precision technique.',choices:['Force more chakra','Reduce output and stabilize','Drop your guard'],best:1},
  {q:'Enemy pressure increases near civilians.',choices:['Create distance and control the area','Escalate immediately','Chase the loudest target'],best:0},
  {q:'The mission objective conflicts with a risky pursuit.',choices:['Protect the objective first','Pursue without support','Wait indefinitely'],best:0},
];

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function threshold(difficulty:number){return clamp(45+difficulty*.22,48,72)}

export function ActivityChallenge({kind,title,difficulty=55,focus,onComplete,onCancel}:Props){
  const [phase,setPhase]=useState<'brief'|'timing'|'memory-show'|'memory-input'|'tactics'|'done'>('brief');
  const [marker,setMarker]=useState(0);
  const [direction,setDirection]=useState(1);
  const [timingScore,setTimingScore]=useState<number|null>(null);
  const sequence=useMemo(()=>Array.from({length:difficulty>=75?5:4},()=>SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]),[difficulty]);
  const [memoryInput,setMemoryInput]=useState<string[]>([]);
  const [memoryScore,setMemoryScore]=useState<number|null>(null);
  const tactic=useMemo(()=>TACTICS[Math.floor(Math.random()*TACTICS.length)],[title]);
  const [tacticScore,setTacticScore]=useState<number|null>(null);
  const rounds=[timingScore,memoryScore,tacticScore].filter((v):v is number=>v!==null);
  const finalScore=rounds.length?Math.round(rounds.reduce((a,b)=>a+b,0)/rounds.length):0;
  const passed=finalScore>=threshold(difficulty);

  useEffect(()=>{
    if(phase!=='timing')return;
    const id=window.setInterval(()=>{
      setMarker(v=>{
        let next=v+direction*2.6;
        if(next>=100){next=100;setDirection(-1)}
        if(next<=0){next=0;setDirection(1)}
        return next;
      });
    },24);
    return()=>window.clearInterval(id);
  },[phase,direction]);

  useEffect(()=>{
    if(phase!=='memory-show')return;
    const id=window.setTimeout(()=>setPhase('memory-input'),1350);
    return()=>window.clearTimeout(id);
  },[phase]);

  const stopTiming=()=>{
    const center=50;
    const distance=Math.abs(marker-center);
    const score=clamp(Math.round(100-distance*3.2));
    setTimingScore(score);setPhase('memory-show');
  };
  const chooseSymbol=(symbol:string)=>{
    if(phase!=='memory-input'||memoryInput.length>=sequence.length)return;
    const next=[...memoryInput,symbol];setMemoryInput(next);
    if(next.length===sequence.length){
      const correct=next.reduce((sum,val,i)=>sum+(val===sequence[i]?1:0),0);
      setMemoryScore(Math.round(correct/sequence.length*100));
      window.setTimeout(()=>setPhase('tactics'),220);
    }
  };
  const chooseTactic=(index:number)=>{setTacticScore(index===tactic.best?100:index===((tactic.best+1)%3)?55:25);setPhase('done')};

  return <div className="activity-overlay" role="dialog" aria-modal="true">
    <div className="activity-panel">
      <div className="activity-head"><div><span className="eyebrow">INTERACTIVE {kind.toUpperCase()}</span><h3>{title}</h3><p>{focus||'Complete three field drills. Your execution affects whether the action succeeds.'}</p></div><button className="mini-link" onClick={onCancel}>Exit</button></div>
      {phase==='brief'&&<div className="activity-brief"><div className="activity-steps"><span>1 · Chakra Timing</span><span>2 · Hand-Sign Memory</span><span>3 · Tactical Decision</span></div><p className="muted">Target score: {Math.round(threshold(difficulty))}. Higher-rank activity demands cleaner execution.</p><button className="btn primary" onClick={()=>setPhase('timing')}>Begin</button></div>}
      {phase==='timing'&&<div className="activity-stage"><span className="eyebrow">ROUND 1 · CHAKRA CONTROL</span><h4>Stop the pulse inside the center zone.</h4><div className="timing-track"><i className="timing-zone"/><b style={{left:`${marker}%`}}/></div><button className="btn primary" onClick={stopTiming}>LOCK CHAKRA</button></div>}
      {phase==='memory-show'&&<div className="activity-stage"><span className="eyebrow">ROUND 2 · HAND SIGNS</span><h4>Memorize the sequence.</h4><div className="memory-sequence">{sequence.map((s,i)=><b key={i}>{s}</b>)}</div></div>}
      {phase==='memory-input'&&<div className="activity-stage"><span className="eyebrow">ROUND 2 · HAND SIGNS</span><h4>Repeat the sequence.</h4><div className="memory-input">{Array.from({length:sequence.length},(_,i)=><b key={i}>{memoryInput[i]||'·'}</b>)}</div><div className="symbol-grid">{SYMBOLS.map(s=><button key={s} onClick={()=>chooseSymbol(s)}>{s}</button>)}</div></div>}
      {phase==='tactics'&&<div className="activity-stage"><span className="eyebrow">ROUND 3 · TACTICAL READ</span><h4>{tactic.q}</h4><div className="tactic-options">{tactic.choices.map((c,i)=><button className="btn secondary" key={c} onClick={()=>chooseTactic(i)}>{c}</button>)}</div></div>}
      {phase==='done'&&<div className={`activity-result ${passed?'passed':'failed'}`}><span className="eyebrow">FIELD RESULT</span><strong>{finalScore}</strong><h3>{passed?'Execution Successful':'Execution Failed'}</h3><div className="activity-rounds"><span>Timing {timingScore}</span><span>Memory {memoryScore}</span><span>Tactics {tacticScore}</span></div><button className="btn primary" onClick={()=>void onComplete({score:finalScore,passed,rounds:rounds as number[]})}>{passed?'Commit Result':'Record Failure'}</button></div>}
    </div>
  </div>;
}
