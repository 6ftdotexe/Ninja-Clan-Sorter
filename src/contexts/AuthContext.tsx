import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {isSupabaseConfigured,supabase} from '../lib/supabase';

type AuthContextValue={
  user:User|null;
  session:Session|null;
  loading:boolean;
  configured:boolean;
  signIn:(email:string,password:string)=>Promise<string|null>;
  signUp:(email:string,password:string)=>Promise<string|null>;
  signOut:()=>Promise<void>;
};

const AuthContext=createContext<AuthContextValue|undefined>(undefined);
const notConfigured='Cloud accounts are not configured yet.';

async function signIn(email:string,password:string){
  if(!supabase)return notConfigured;
  try{
    const {error}=await supabase.auth.signInWithPassword({email,password});
    return error?.message??null;
  }catch{
    return 'Could not reach the account service. Check your connection and try again.';
  }
}

async function signUp(email:string,password:string){
  if(!supabase)return notConfigured;
  try{
    const {error}=await supabase.auth.signUp({email,password});
    return error?.message??null;
  }catch{
    return 'Could not reach the account service. Check your connection and try again.';
  }
}

async function signOut(){
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}

export function AuthProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(isSupabaseConfigured);

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    let mounted=true;
    const finish=(next:Session|null)=>{if(mounted){setSession(next);setLoading(false)}};

    void supabase.auth.getSession()
      .then(({data,error})=>finish(error?null:data.session))
      .catch(()=>finish(null));

    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>finish(next));
    return()=>{mounted=false;subscription.unsubscribe()};
  },[]);

  const value=useMemo<AuthContextValue>(()=>({
    user:session?.user??null,
    session,
    loading,
    configured:isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
  }),[session,loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
  const context=useContext(AuthContext);
  if(!context)throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
