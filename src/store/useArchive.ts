import {create} from 'zustand';
import {createJSONStorage,persist,type StateStorage} from 'zustand/middleware';
import type {TestId,TestResult} from '../types';

const ARCHIVE_KEY='shinobiArchiveV10';
const LEGACY_ARCHIVE_KEYS=['shinobiArchiveV9','shinobiArchiveV8','shinobiArchiveV7','shinobiArchiveV6'] as const;
const HISTORY_LIMIT=20;

const memoryStorage=new Map<string,string>();
const safeStorage={
  getItem:(name:string):string|null=>{
    try{
      const value=localStorage.getItem(name);
      if(value&&name.startsWith('shinobiArchive')){try{JSON.parse(value)}catch{localStorage.removeItem(name);return null}}
      return value;
    }catch{return memoryStorage.get(name)??null}
  },
  setItem:(name:string,value:string):void=>{try{localStorage.setItem(name,value)}catch{memoryStorage.set(name,value)}},
  removeItem:(name:string):void=>{try{localStorage.removeItem(name)}catch{memoryStorage.delete(name)}},
} satisfies StateStorage;

function migrateLegacyArchive(){
  if(typeof window==='undefined')return;
  try{
    if(safeStorage.getItem(ARCHIVE_KEY))return;
    for(const key of LEGACY_ARCHIVE_KEYS){
      const legacy=safeStorage.getItem(key);
      if(legacy){safeStorage.setItem(ARCHIVE_KEY,legacy);return}
    }
  }catch{
    // The archive still works in-memory when browser storage is restricted.
  }
}

migrateLegacyArchive();

type Results=Partial<Record<TestId,TestResult>>;
interface HistoryItem {testId:TestId;winner:string;date:string}
interface ArchiveState {
  name:string;
  activeCharacterId:string|null;
  results:Results;
  history:HistoryItem[];
  pending:TestResult|null;
  setName:(name:string)=>void;
  setActiveCharacterId:(id:string|null)=>void;
  loadCharacter:(id:string,name:string,results:Results)=>void;
  setPending:(result:TestResult|null)=>void;
  savePending:()=>void;
  saveResult:(result:TestResult)=>void;
  reset:()=>void;
}

const historyEntry=(result:TestResult):HistoryItem=>({testId:result.testId,winner:result.winner,date:new Date().toISOString()});
const prependHistory=(history:HistoryItem[],result:TestResult)=>[historyEntry(result),...history].slice(0,HISTORY_LIMIT);
const emptyArchive=()=>({name:'',activeCharacterId:null,results:{} as Results,history:[] as HistoryItem[],pending:null});

export const useArchive=create<ArchiveState>()(persist((set,get)=>({
  ...emptyArchive(),
  setName:name=>set({name}),
  setActiveCharacterId:activeCharacterId=>set({activeCharacterId}),
  loadCharacter:(activeCharacterId,name,results)=>set({activeCharacterId,name,results,history:[],pending:null}),
  setPending:pending=>set({pending}),
  savePending:()=>{
    const result=get().pending;
    if(!result)return;
    set(state=>({results:{...state.results,[result.testId]:result},history:prependHistory(state.history,result),pending:null}));
  },
  saveResult:result=>set(state=>({results:{...state.results,[result.testId]:result},history:prependHistory(state.history,result)})),
  reset:()=>set(emptyArchive())
}),{name:ARCHIVE_KEY,storage:createJSONStorage(()=>safeStorage)}));
