import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useArchive} from '../store/useArchive';
import {deriveCombatStats,normalizeProfile} from '../utils/character';

export function errorMessage(error: unknown, fallback = 'Something went wrong.') {
  if(error instanceof DOMException && error.name==='AbortError') return 'The request timed out. Please try again.';
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useActiveShinobi() {
  const {name,activeCharacterId,results} = useArchive();
  const profile = useMemo(
    () => normalizeProfile(name, activeCharacterId, results),
    [name, activeCharacterId, results],
  );
  const stats = useMemo(() => deriveCombatStats(profile), [profile]);
  return {name, activeCharacterId, results, profile, stats};
}

type RunOptions = {
  fallback?: string;
  success?: string;
  after?: () => void | Promise<void>;
};

export function useAsyncAction(defaultFallback = 'Action failed.') {
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const mounted=useRef(true);
  const activeRuns=useRef(0);
  const latestRun=useRef(0);

  useEffect(()=>()=>{mounted.current=false},[]);

  const run = useCallback(async <T,>(task: () => Promise<T>, options: RunOptions = {}) => {
    const runId=++latestRun.current;
    activeRuns.current+=1;
    if(mounted.current){setBusy(true);setError('');setNotice('')}
    try {
      const value = await task();
      if(options.after) await options.after();
      if(mounted.current && runId===latestRun.current && options.success) setNotice(options.success);
      return value;
    } catch (error) {
      if(mounted.current && runId===latestRun.current) setError(errorMessage(error, options.fallback ?? defaultFallback));
      return undefined;
    } finally {
      activeRuns.current=Math.max(0,activeRuns.current-1);
      if(mounted.current && activeRuns.current===0) setBusy(false);
    }
  }, [defaultFallback]);

  return {busy,error,notice,setError,setNotice,clear:()=>{setError('');setNotice('')},run};
}

export function Feedback({error,notice}:{error?:string;notice?:string}) {
  return <>{error&&<div className="generator-error" role="alert">{error}</div>}{notice&&<div className="generator-notice" role="status">{notice}</div>}</>;
}

export function PageHeader({eyebrow,title,description,action}:{eyebrow:string;title:string;description?:string;action?:ReactNode}) {
  return <div className="dash-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{description&&<p>{description}</p>}{action}</div>;
}

export function SectionHeader({eyebrow,title,meta,action}:{eyebrow:string;title:string;meta?:ReactNode;action?:ReactNode}) {
  return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>{action??meta}</div>;
}
