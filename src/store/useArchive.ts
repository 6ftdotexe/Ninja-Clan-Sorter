import {create} from 'zustand';import {persist} from 'zustand/middleware';import type {TestId,TestResult} from '../types/quiz';
const V9_KEY='shinobiArchiveV9';
if(typeof window!=='undefined'&&!localStorage.getItem(V9_KEY)){
  const legacy=localStorage.getItem('shinobiArchiveV8')||localStorage.getItem('shinobiArchiveV7')||localStorage.getItem('shinobiArchiveV6');
  if(legacy)localStorage.setItem(V9_KEY,legacy);
}
interface HistoryItem {testId:TestId;winner:string;date:string}
interface ArchiveState {name:string;results:Partial<Record<TestId,TestResult>>;history:HistoryItem[];pending:TestResult|null;setName:(name:string)=>void;setPending:(r:TestResult|null)=>void;savePending:()=>void;saveResult:(r:TestResult)=>void;reset:()=>void}
export const useArchive=create<ArchiveState>()(persist((set,get)=>({
  name:'',results:{},history:[],pending:null,
  setName:name=>set({name}),setPending:pending=>set({pending}),
  savePending:()=>{const r=get().pending;if(!r)return;set(s=>({results:{...s.results,[r.testId]:r},history:[{testId:r.testId,winner:r.winner,date:new Date().toISOString()},...s.history].slice(0,20),pending:null}));},
  saveResult:r=>set(s=>({results:{...s.results,[r.testId]:r},history:[{testId:r.testId,winner:r.winner,date:new Date().toISOString()},...s.history].slice(0,20)})),
  reset:()=>set({name:'',results:{},history:[],pending:null})
}),{name:V9_KEY}));
