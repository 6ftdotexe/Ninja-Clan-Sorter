import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {isSupabaseConfigured,supabase} from '../lib/supabase';

type AuthContextValue={user:User|null;session:Session|null;loading:boolean;configured:boolean;signIn:(email:string,password:string)=>Promise<string|null>;signUp:(email:string,password:string)=>Promise<string|null>;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthContextValue|undefined>(undefined);

export function AuthProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null);const [loading,setLoading]=useState(isSupabaseConfigured);
  useEffect(()=>{if(!supabase){setLoading(false);return;} let mounted=true;supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setLoading(false)}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});return()=>{mounted=false;subscription.unsubscribe()};},[]);
  const value=useMemo<AuthContextValue>(()=>({user:session?.user??null,session,loading,configured:isSupabaseConfigured,signIn:async(email,password)=>{if(!supabase)return'Cloud accounts are not configured yet.';const {error}=await supabase.auth.signInWithPassword({email,password});return error?.message??null;},signUp:async(email,password)=>{if(!supabase)return'Cloud accounts are not configured yet.';const {error}=await supabase.auth.signUp({email,password});return error?.message??null;},signOut:async()=>{if(supabase)await supabase.auth.signOut();}}),[session,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used inside AuthProvider');return ctx;}
