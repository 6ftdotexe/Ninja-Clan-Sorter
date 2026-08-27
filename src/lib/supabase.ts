import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured=Boolean(url&&key&&url.startsWith('http'));
export const supabase:SupabaseClient|null=isSupabaseConfigured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
