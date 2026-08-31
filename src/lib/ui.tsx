import type {ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';

export function PageHeader({eyebrow,title,description,actions,className='dash-head'}:{eyebrow:string;title:ReactNode;description?:ReactNode;actions?:ReactNode;className?:string}){
  return <div className={className}><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description&&className==='discover-head'?<p>{description}</p>:null}</div>{description&&className!=='discover-head'?<p>{description}</p>:null}{actions}</div>;
}

export function SectionHeader({eyebrow,title,meta,action}:{eyebrow:string;title:ReactNode;meta?:ReactNode;action?:ReactNode}){
  return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>{action??(meta!==undefined?<span>{meta}</span>:null)}</div>;
}

export function ActionRow({children,className='cloud-card-actions'}:{children:ReactNode;className?:string}){
  return <div className={className}>{children}</div>;
}

export function EmptyState({title,description,actionLabel,actionTo}:{title:string;description?:string;actionLabel?:string;actionTo?:string}){
  const navigate=useNavigate();
  return <div className="screen page-enter"><h2>{title}</h2>{description&&<p className="lede">{description}</p>}{actionLabel&&actionTo&&<button className="btn primary" onClick={()=>navigate(actionTo)}>{actionLabel}</button>}</div>;
}

export function EmptyMessage({children}:{children:ReactNode}){return <p className="muted">{children}</p>}

export function ProgressBar({value,className='progress'}:{value:number;className?:string}){
  const pct=Math.max(0,Math.min(100,value));
  return <div className={className}><i style={{width:`${pct}%`}}/></div>;
}

export function SocialTabs({active}:{active:'teams'|'rivals'|'matchups'}){
  const navigate=useNavigate();
  return <div className="social-tabs">{(['teams','rivals','matchups'] as const).map(tab=><button key={tab} className={active===tab?'active':undefined} onClick={()=>navigate(`/${tab}`)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}</div>;
}

export function FormField({label,count,children}:{label:ReactNode;count?:ReactNode;children:ReactNode}){
  return <label>{label}{count!==undefined&&<span>{count}</span>}{children}</label>;
}
