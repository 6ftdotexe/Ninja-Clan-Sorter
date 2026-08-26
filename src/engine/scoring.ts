import type {Question,ScoreMap,TestDefinition,TestResult} from '../types/quiz';

export function shuffle<T>(items:T[],random=Math.random):T[]{
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
export function selectQuestions(test:TestDefinition,random=Math.random){return shuffle(test.questions,random).slice(0,Math.min(test.questionCount,test.questions.length));}

export function scoreAnswers(test:TestDefinition,questions:Question[],answers:number[]):TestResult{
  const totals:ScoreMap={};
  questions.forEach((q,i)=>{const pick=q.answers[answers[i]];if(!pick)return;for(const [key,value] of Object.entries(pick.scores))totals[key]=(totals[key]||0)+value;});
  const ranked=Object.entries(totals).sort((a,b)=>{
    const ar=test.outcomes[a[0]]?.rarity||1,br=test.outcomes[b[0]]?.rarity||1;
    return (b[1]/br)-(a[1]/ar);
  });
  const [winner,top]=ranked[0]??[Object.keys(test.outcomes)[0],1];
  const runnerUp=ranked[1]?.[1]??0;
  const margin=top?Math.max(0,(top-runnerUp)/top):0;
  const coverage=questions.length?answers.filter(Number.isInteger).length/questions.length:0;
  const confidence=Math.round(Math.max(55,Math.min(97,62+margin*27+coverage*8)));
  const result:TestResult={testId:test.id,winner,confidence,alternates:ranked.slice(1,4).map(([id,score])=>({id,percent:Math.max(1,Math.min(99,Math.round((score/(top||1))*100)))}))};
  if(test.id==='chakra'){
    result.secondary=ranked[1]?.[0]||'Wind';
    const pair=[winner,result.secondary].sort().join('+');
    const releases:Record<string,string>={'Water+Wind':'Ice Release','Earth+Water':'Wood Release Potential','Earth+Fire':'Lava Release','Lightning+Water':'Storm Release','Fire+Wind':'Scorch Release','Earth+Lightning':'Explosion Release Potential'};
    result.advanced=releases[pair]||'No dominant combined nature';
  }
  if(test.id==='clan'){
    const metaByClan:Record<string,[string,string,string,string,string]>= {
      Uchiha:['Fire','Konohagakure','Assault','Commander','Elite Jōnin'],Hyuga:['Lightning','Konohagakure','Recon','Analyst','Jōnin'],Uzumaki:['Wind','Konohagakure','Guardian','Catalyst','Kage Candidate'],Nara:['Earth','Konohagakure','Tactician','Analyst','Elite Jōnin'],Akimichi:['Earth','Konohagakure','Guardian','Protector','Jōnin'],Yamanaka:['Water','Konohagakure','Support','Mentor','Jōnin'],Aburame:['Earth','Konohagakure','Recon','Analyst','Jōnin'],Inuzuka:['Wind','Konohagakure','Assault','Catalyst','Jōnin'],Senju:['Water','Konohagakure','Guardian','Commander','Kage Candidate'],Sarutobi:['Fire','Konohagakure','Tactician','Mentor','Elite Jōnin'],Kazekage:['Wind','Sunagakure','Tactician','Commander','Kage Candidate'],Yuki:['Water','Kirigakure','Support','Mentor','Jōnin'],Hozuki:['Water','Kirigakure','Recon','Catalyst','Elite Jōnin'],Jugo:['Earth','Kumogakure','Assault','Protector','Elite Jōnin'],Kaguya:['Earth','Kirigakure','Assault','Commander','Elite Jōnin'],Otsutsuki:['Lightning','Unknown','Tactician','Commander','Kage Candidate']};
    const [chakra,village,role,lead,rank]=metaByClan[winner]||['Fire','Konohagakure','Tactician','Analyst','Jōnin'];
    result.meta={chakra,village,role,lead,rank};
  }
  return result;
}
