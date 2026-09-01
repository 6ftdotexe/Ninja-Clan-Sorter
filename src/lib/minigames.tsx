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

type RoundType='timing'|'memory'|'decision'|'reaction'|'combo';
type RoundSpec={type:RoundType;label:string;instruction:string};
type Decision={q:string;choices:string[];best:number};

const SYMBOLS=['火','水','風','雷','土','忍','影','印'];
const COMBO=['↑','→','↓','←','火','雷'];

const PLANS:Record<ActivityKind,RoundSpec[]>={
  mission:[
    {type:'decision',label:'Stealth Route',instruction:'Read the field and choose the safest mission approach.'},
    {type:'reaction',label:'Threat Response',instruction:'React to exposed threats before they compromise the objective.'},
    {type:'timing',label:'Extraction Window',instruction:'Commit at the correct moment and get out clean.'},
  ],
  training:[
    {type:'reaction',label:'Reaction Drill',instruction:'Hit the active targets as quickly and cleanly as possible.'},
    {type:'timing',label:'Chakra Precision',instruction:'Lock your chakra inside the ideal control window.'},
    {type:'combo',label:'Technique Combo',instruction:'Execute the displayed movement sequence without losing rhythm.'},
  ],
  exam:[
    {type:'memory',label:'Written Recall',instruction:'Memorize the exam pattern under pressure.'},
    {type:'decision',label:'Tactical Judgment',instruction:'Choose the action that best protects the team and objective.'},
    {type:'combo',label:'Practical Execution',instruction:'Perform the required sequence cleanly enough to advance.'},
  ],
  world:[
    {type:'reaction',label:'Crisis Response',instruction:'Respond to rapidly changing field hazards.'},
    {type:'decision',label:'Incident Command',instruction:'Choose the response that best stabilizes the situation.'},
    {type:'timing',label:'Critical Window',instruction:'Commit during the narrow opening before the incident escalates.'},
  ],
  team:[
    {type:'memory',label:'Squad Signals',instruction:'Memorize and reproduce the team command sequence.'},
    {type:'decision',label:'Formation Call',instruction:'Choose the formation adjustment that protects the squad.'},
    {type:'combo',label:'Coordinated Push',instruction:'Execute the squad command sequence in order.'},
  ],
  war:[
    {type:'decision',label:'Frontline Command',instruction:'Make the best battlefield call under pressure.'},
    {type:'reaction',label:'Counterattack',instruction:'Respond to openings before the enemy line closes.'},
    {type:'combo',label:'Battle Formation',instruction:'Issue the command sequence cleanly enough to hold the front.'},
  ],
  mastery:[
    {type:'memory',label:'Hand-Sign Recall',instruction:'Memorize the technique sequence.'},
    {type:'timing',label:'Chakra Molding',instruction:'Stabilize chakra at the precise point required by the jutsu.'},
    {type:'combo',label:'Technique Execution',instruction:'Complete the final sequence without breaking flow.'},
  ],
};

const DECISIONS:Record<ActivityKind,Decision[]>={
  mission:[
    {q:'Patrols overlap near the objective and your route is exposed.',choices:['Rush before they converge','Use cover and reroute around the overlap','Create a loud diversion beside the objective'],best:1},
    {q:'You recover the target intel, but a secondary pursuit opens up.',choices:['Secure the mission objective and extract','Chase the secondary target alone','Stay in place and wait for another opening'],best:0},
    {q:'A civilian crosses the planned infiltration route.',choices:['Pause and shift the approach','Continue through the civilian area','Force the civilian to move'],best:0},
  ],
  training:[
    {q:'Your form breaks down late in a repetition.',choices:['Slow down and restore technique','Force the rep at any cost','Ignore the mistake and speed up'],best:0},
    {q:'Your chakra spikes during precision work.',choices:['Stabilize output before continuing','Push more chakra immediately','Drop the drill entirely'],best:0},
  ],
  exam:[
    {q:'Your team can finish quickly only by leaving one member exposed.',choices:['Protect the teammate and adapt the plan','Take the fast route regardless','Wait until another team solves it first'],best:0},
    {q:'The obvious answer conflicts with the mission objective.',choices:['Prioritize the objective and justify the decision','Follow the obvious answer anyway','Refuse to choose'],best:0},
    {q:'An opponent tries to bait you into a reckless exchange.',choices:['Maintain position and force them to overextend','Accept the exchange immediately','Turn your back and disengage blindly'],best:0},
  ],
  world:[
    {q:'A disaster zone is expanding toward a populated district.',choices:['Establish a safe corridor and contain the spread','Pursue the source alone','Evacuate only the closest building'],best:0},
    {q:'A rogue target enters a crowded market.',choices:['Control exits and isolate the target','Attack through the crowd','Abandon the operation'],best:0},
    {q:'A summoning breach is destabilizing nearby structures.',choices:['Secure civilians before confronting the summon','Ignore the structures and attack immediately','Split the team with no coordination'],best:0},
  ],
  team:[
    {q:'Your lead shinobi is pressured while the support line is intact.',choices:['Rotate support and preserve spacing','Send everyone forward','Break formation in different directions'],best:0},
    {q:'The squad loses visual contact in dense terrain.',choices:['Regroup on the last confirmed point','Continue independently','Call every member forward at once'],best:0},
    {q:'One member identifies a flank route during an engagement.',choices:['Confirm it and shift roles deliberately','Move the whole squad without confirmation','Ignore the information'],best:0},
  ],
  war:[
    {q:'The center line is holding, but the right flank is collapsing.',choices:['Reinforce the flank while preserving the center','Send every unit to the flank','Abandon the position entirely'],best:0},
    {q:'Enemy reserves appear after your first push.',choices:['Consolidate gains and prepare the counter','Continue advancing without support','Scatter the formation'],best:0},
    {q:'A village ally requests support while your objective remains contested.',choices:['Commit a measured reserve without abandoning your objective','Withdraw everyone immediately','Ignore the allied line'],best:0},
  ],
  mastery:[
    {q:'The technique destabilizes at the final hand sign.',choices:['Reset the chakra shape and repeat cleanly','Force the release anyway','Increase power without correcting form'],best:0},
    {q:'You can add power by sacrificing control.',choices:['Keep control and preserve the technique','Trade all control for output','Stop practicing permanently'],best:0},
  ],
};

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function threshold(difficulty:number){return clamp(45+difficulty*.22,48,72)}
function randomItem<T>(items:T[]){return items[Math.floor(Math.random()*items.length)]}

export function ActivityChallenge({kind,title,difficulty=55,focus,onComplete,onCancel}:Props){
  const plan=PLANS[kind];
  const [started,setStarted]=useState(false);
  const [roundIndex,setRoundIndex]=useState(0);
  const [scores,setScores]=useState<number[]>([]);
  const current=plan[roundIndex];
  const finished=started&&roundIndex>=plan.length;
  const finalScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const passed=finalScore>=threshold(difficulty);

  const completeRound=(score:number)=>{
    setScores(prev=>[...prev,clamp(Math.round(score))]);
    setRoundIndex(index=>index+1);
  };

  return <div className="activity-overlay" role="dialog" aria-modal="true">
    <div className="activity-panel">
      <div className="activity-head"><div><span className="eyebrow">INTERACTIVE {kind.toUpperCase()}</span><h3>{title}</h3><p>{focus||'Your execution directly affects the outcome.'}</p></div><button className="mini-link" onClick={onCancel}>Exit</button></div>
      {!started&&<div className="activity-brief"><div className="activity-steps">{plan.map((round,index)=><span key={round.label}>{index+1} · {round.label}</span>)}</div><p className="muted">Target score: {Math.round(threshold(difficulty))}. This activity uses a {kind}-specific challenge set rather than the generic field drill.</p><button className="btn primary" onClick={()=>setStarted(true)}>Begin {kind==='exam'?'Stage':'Activity'}</button></div>}
      {started&&!finished&&<div className="activity-progress"><span>ROUND {roundIndex+1} / {plan.length}</span><div><i style={{width:`${roundIndex/plan.length*100}%`}}/></div><strong>{current.label}</strong></div>}
      {started&&!finished&&current.type==='timing'&&<TimingRound spec={current} difficulty={difficulty} onDone={completeRound}/>}      
      {started&&!finished&&current.type==='memory'&&<MemoryRound spec={current} difficulty={difficulty} onDone={completeRound}/>}      
      {started&&!finished&&current.type==='decision'&&<DecisionRound spec={current} kind={kind} onDone={completeRound}/>}      
      {started&&!finished&&current.type==='reaction'&&<ReactionRound spec={current} difficulty={difficulty} onDone={completeRound}/>}      
      {started&&!finished&&current.type==='combo'&&<ComboRound spec={current} difficulty={difficulty} onDone={completeRound}/>}      
      {finished&&<div className={`activity-result ${passed?'passed':'failed'}`}><span className="eyebrow">{kind.toUpperCase()} RESULT</span><strong>{finalScore}</strong><h3>{passed?'Execution Successful':'Execution Failed'}</h3><div className="activity-rounds">{plan.map((round,index)=><span key={round.label}>{round.label} {scores[index]??0}</span>)}</div><button className="btn primary" onClick={()=>void onComplete({score:finalScore,passed,rounds:scores})}>{passed?'Commit Result':'Record Failure'}</button></div>}
    </div>
  </div>;
}


export type MissionAdventureResult={score:number;passed:boolean;stageScores:number[];route:string[]};

type MissionAdventureProps={
  title:string;
  difficulty?:number;
  objective:string;
  location?:string;
  onComplete:(result:MissionAdventureResult)=>void|Promise<void>;
  onCancel:()=>void;
};

type MissionStageChoice={label:string;detail:string;risk:number;bonus:number;kind:ActivityKind};
type MissionStage={name:string;brief:string;choices:MissionStageChoice[]};

const MISSION_STAGES:MissionStage[]=[
  {name:'Infiltration',brief:'Choose how to approach the mission zone without losing the initiative.',choices:[
    {label:'Silent Route',detail:'Lower risk, cleaner approach, smaller score ceiling.',risk:-8,bonus:0,kind:'mission'},
    {label:'High Ground',detail:'Balanced route with better field visibility.',risk:0,bonus:4,kind:'training'},
    {label:'Direct Breach',detail:'Fast and dangerous. Strong execution earns a larger bonus.',risk:10,bonus:10,kind:'war'},
  ]},
  {name:'Objective',brief:'The target is in reach. Decide how you will secure the mission objective.',choices:[
    {label:'Precision',detail:'Controlled technique execution with minimal collateral risk.',risk:-4,bonus:3,kind:'mastery'},
    {label:'Tactical Control',detail:'Read the field and solve the objective through positioning.',risk:2,bonus:6,kind:'exam'},
    {label:'Overwhelming Push',detail:'Maximum pressure. Harder execution, highest potential payoff.',risk:12,bonus:12,kind:'team'},
  ]},
  {name:'Extraction',brief:'The objective is secured. Get out before the field closes around you.',choices:[
    {label:'Disappear',detail:'Break contact and leave no trail.',risk:-6,bonus:2,kind:'mission'},
    {label:'Protective Withdrawal',detail:'Safer for allies and civilians, but requires coordination.',risk:3,bonus:6,kind:'team'},
    {label:'Counter Pursuit',detail:'Turn the escape into a final counterattack.',risk:14,bonus:14,kind:'world'},
  ]},
];

export function MissionAdventure({title,difficulty=55,objective,location,onComplete,onCancel}:MissionAdventureProps){
  const [stageIndex,setStageIndex]=useState(0);
  const [choice,setChoice]=useState<MissionStageChoice|null>(null);
  const [scores,setScores]=useState<number[]>([]);
  const [route,setRoute]=useState<string[]>([]);
  const [finished,setFinished]=useState(false);
  const stage=MISSION_STAGES[stageIndex];
  const finalScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const passMark=threshold(difficulty);
  const finishStage=async(result:ActivityResult)=>{
    if(!choice)return;
    const adjusted=clamp(result.score+choice.bonus-Math.max(0,choice.risk*.25));
    const nextScores=[...scores,Math.round(adjusted)];
    const nextRoute=[...route,choice.label];
    setScores(nextScores);setRoute(nextRoute);setChoice(null);
    if(stageIndex>=MISSION_STAGES.length-1){setFinished(true);return;}
    setStageIndex(v=>v+1);
  };
  if(choice&&!finished){
    return <ActivityChallenge kind={choice.kind} title={`${title} · ${stage.name}`} difficulty={clamp(difficulty+choice.risk,25,95)} focus={`${stage.brief} Route: ${choice.label}. ${choice.detail}`} onCancel={()=>setChoice(null)} onComplete={finishStage}/>;
  }
  return <div className="activity-overlay" role="dialog" aria-modal="true"><div className="activity-panel mission-adventure">
    <div className="activity-head"><div><span className="eyebrow">MULTI-STAGE MISSION</span><h3>{title}</h3><p>{location?`${location} · `:''}{objective}</p></div><button className="mini-link" onClick={onCancel}>Exit</button></div>
    {!finished&&<><div className="mission-map">{MISSION_STAGES.map((item,index)=><div key={item.name} className={index<stageIndex?'complete':index===stageIndex?'active':''}><span>{index+1}</span><strong>{item.name}</strong><small>{scores[index]!==undefined?`${scores[index]} pts`:index===stageIndex?'ACTIVE':'LOCKED'}</small></div>)}</div><div className="mission-stage-choice"><span className="eyebrow">STAGE {stageIndex+1} / {MISSION_STAGES.length}</span><h3>{stage.name}</h3><p>{stage.brief}</p><div className="mission-route-grid">{stage.choices.map(option=><button key={option.label} onClick={()=>setChoice(option)}><strong>{option.label}</strong><span>{option.detail}</span><small>{option.risk>0?`Risk +${option.risk}`:`Risk ${option.risk}`} · Bonus +${option.bonus}</small></button>)}</div></div></>}
    {finished&&<div className={`activity-result ${finalScore>=passMark?'passed':'failed'}`}><span className="eyebrow">MISSION DEBRIEF</span><strong>{finalScore}</strong><h3>{finalScore>=passMark?'Mission Success':'Mission Failed'}</h3><p className="muted">Required score: {Math.round(passMark)}. Your route choices carried forward across all three stages.</p><div className="activity-rounds">{MISSION_STAGES.map((item,index)=><span key={item.name}>{item.name}: {route[index]} · {scores[index]??0}</span>)}</div><button className="btn primary" onClick={()=>void onComplete({score:finalScore,passed:finalScore>=passMark,stageScores:scores,route})}>{finalScore>=passMark?'Complete Mission':'Record Failure'}</button></div>}
  </div></div>;
}

function TimingRound({spec,difficulty,onDone}:{spec:RoundSpec;difficulty:number;onDone:(score:number)=>void}){
  const [marker,setMarker]=useState(0);
  const [direction,setDirection]=useState(1);
  const target=useMemo(()=>35+Math.random()*30,[spec.label]);
  const zone=Math.max(8,18-difficulty*.08);
  useEffect(()=>{
    const id=window.setInterval(()=>setMarker(v=>{
      let next=v+direction*(2.4+difficulty*.012);
      if(next>=100){next=100;setDirection(-1)}
      if(next<=0){next=0;setDirection(1)}
      return next;
    }),24);
    return()=>window.clearInterval(id);
  },[direction,difficulty]);
  const stop=()=>{
    const distance=Math.abs(marker-target);
    onDone(clamp(100-distance*(100/(zone*2.4))));
  };
  return <div className="activity-stage"><span className="eyebrow">{spec.label.toUpperCase()}</span><h4>{spec.instruction}</h4><div className="timing-track"><i className="timing-zone" style={{left:`${target-zone/2}%`,width:`${zone}%`}}/><b style={{left:`${marker}%`}}/></div><button className="btn primary" onClick={stop}>LOCK TIMING</button></div>;
}

function MemoryRound({spec,difficulty,onDone}:{spec:RoundSpec;difficulty:number;onDone:(score:number)=>void}){
  const length=difficulty>=82?6:difficulty>=65?5:4;
  const sequence=useMemo(()=>Array.from({length},()=>randomItem(SYMBOLS)),[length,spec.label]);
  const [showing,setShowing]=useState(true);
  const [input,setInput]=useState<string[]>([]);
  useEffect(()=>{const id=window.setTimeout(()=>setShowing(false),Math.max(950,1650-difficulty*5));return()=>window.clearTimeout(id)},[difficulty]);
  const choose=(symbol:string)=>{
    if(showing||input.length>=sequence.length)return;
    const next=[...input,symbol];setInput(next);
    if(next.length===sequence.length){
      const correct=next.reduce((sum,val,index)=>sum+(val===sequence[index]?1:0),0);
      window.setTimeout(()=>onDone(correct/sequence.length*100),180);
    }
  };
  return <div className="activity-stage"><span className="eyebrow">{spec.label.toUpperCase()}</span><h4>{spec.instruction}</h4>{showing?<div className="memory-sequence">{sequence.map((s,i)=><b key={i}>{s}</b>)}</div>:<><div className="memory-input">{sequence.map((_,i)=><b key={i}>{input[i]||'·'}</b>)}</div><div className="symbol-grid">{SYMBOLS.map(s=><button key={s} onClick={()=>choose(s)}>{s}</button>)}</div></>}</div>;
}

function DecisionRound({spec,kind,onDone}:{spec:RoundSpec;kind:ActivityKind;onDone:(score:number)=>void}){
  const decision=useMemo(()=>randomItem(DECISIONS[kind]),[kind,spec.label]);
  const choose=(index:number)=>onDone(index===decision.best?100:index===((decision.best+1)%decision.choices.length)?55:25);
  return <div className="activity-stage"><span className="eyebrow">{spec.label.toUpperCase()}</span><h4>{decision.q}</h4><p className="muted">{spec.instruction}</p><div className="tactic-options">{decision.choices.map((choice,index)=><button className="btn secondary" key={choice} onClick={()=>choose(index)}>{choice}</button>)}</div></div>;
}

function ReactionRound({spec,difficulty,onDone}:{spec:RoundSpec;difficulty:number;onDone:(score:number)=>void}){
  const targetCount=difficulty>=80?9:difficulty>=60?8:7;
  const [target,setTarget]=useState(()=>Math.floor(Math.random()*9));
  const [hits,setHits]=useState(0);
  const [attempts,setAttempts]=useState(0);
  const [remaining,setRemaining]=useState(targetCount);
  const interval=Math.max(360,720-difficulty*3.4);
  useEffect(()=>{
    const id=window.setInterval(()=>{
      setRemaining(v=>{
        if(v<=1){window.clearInterval(id);window.setTimeout(()=>onDone(clamp((hits/targetCount)*100-(attempts-hits)*8)),80);return 0}
        setTarget(Math.floor(Math.random()*9));return v-1;
      });
    },interval);
    return()=>window.clearInterval(id);
  },[interval,targetCount,hits,attempts]);
  const tap=(index:number)=>{
    setAttempts(v=>v+1);
    if(index===target){setHits(v=>v+1);setTarget(Math.floor(Math.random()*9));}
  };
  return <div className="activity-stage"><span className="eyebrow">{spec.label.toUpperCase()}</span><h4>{spec.instruction}</h4><div className="reaction-meta"><span>Hits {hits}</span><span>Targets left {remaining}</span></div><div className="reaction-grid">{Array.from({length:9},(_,index)=><button aria-label={`reaction target ${index+1}`} className={index===target?'active':''} key={index} onClick={()=>tap(index)}>{index===target?'✦':'·'}</button>)}</div></div>;
}

function ComboRound({spec,difficulty,onDone}:{spec:RoundSpec;difficulty:number;onDone:(score:number)=>void}){
  const length=difficulty>=82?7:difficulty>=65?6:5;
  const sequence=useMemo(()=>Array.from({length},()=>randomItem(COMBO)),[length,spec.label]);
  const [input,setInput]=useState<string[]>([]);
  const [mistakes,setMistakes]=useState(0);
  const [seconds,setSeconds]=useState(Math.max(5,9-Math.floor(difficulty/25)));
  useEffect(()=>{
    const id=window.setInterval(()=>setSeconds(v=>{
      if(v<=1){window.clearInterval(id);window.setTimeout(()=>onDone(clamp((input.length/sequence.length)*75-mistakes*10)),60);return 0}
      return v-1;
    }),1000);
    return()=>window.clearInterval(id);
  },[input.length,mistakes,sequence.length]);
  const choose=(symbol:string)=>{
    if(input.length>=sequence.length||seconds<=0)return;
    const expected=sequence[input.length];
    if(symbol===expected){
      const next=[...input,symbol];setInput(next);
      if(next.length===sequence.length){const speedBonus=Math.min(25,seconds*4);window.setTimeout(()=>onDone(clamp(100-mistakes*12+speedBonus)),80)}
    }else setMistakes(v=>v+1);
  };
  return <div className="activity-stage"><span className="eyebrow">{spec.label.toUpperCase()}</span><h4>{spec.instruction}</h4><div className="combo-meta"><span>{seconds}s</span><span>{mistakes} mistakes</span></div><div className="combo-sequence">{sequence.map((symbol,index)=><b className={index<input.length?'done':index===input.length?'current':''} key={`${symbol}-${index}`}>{symbol}</b>)}</div><div className="combo-controls">{COMBO.map(symbol=><button key={symbol} onClick={()=>choose(symbol)}>{symbol}</button>)}</div></div>;
}
