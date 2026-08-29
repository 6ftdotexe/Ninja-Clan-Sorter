import {useState} from 'react';
import {Navigate,useNavigate,useParams} from 'react-router-dom';
import {ResultView} from '../components/ResultView';
import {tests} from '../data/tests';
import {useArchive} from '../store/useArchive';
import {useAuth} from '../contexts/AuthContext';
import {saveArchiveToCharacter} from '../services/characterService';
import type {TestId} from '../types/quiz';

export function ResultPage(){
  const {testId}=useParams();
  const navigate=useNavigate();
  const {user}=useAuth();
  const {pending,results,savePending,activeCharacterId}=useArchive();
  const [saveError,setSaveError]=useState('');
  if(!testId||!(testId in tests))return <Navigate to="/archive" replace/>;
  const id=testId as TestId;
  const result=pending?.testId===id?pending:results[id];
  if(!result)return <Navigate to={`/test/${id}`} replace/>;

  const archiveResult=async()=>{
    setSaveError('');
    if(pending?.testId===id)savePending();
    if(user&&activeCharacterId){
      try{
        const state=useArchive.getState();
        await saveArchiveToCharacter(user.id,activeCharacterId,state.name,state.results);
      }catch(error){
        setSaveError(error instanceof Error?`Saved locally, but cloud sync failed: ${error.message}`:'Saved locally, but cloud sync failed.');
        return;
      }
    }
    navigate('/archive');
  };

  return <div className="page-enter">{saveError&&<div className="generator-error">{saveError}</div>}<ResultView test={tests[id]} result={result} onSave={()=>{void archiveResult()}} onRetake={()=>navigate(`/test/${id}`)} onArchive={()=>navigate('/archive')}/></div>;
}
