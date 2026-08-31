import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** Public browser Supabase configuration only. Never put a service-role key in VITE_. */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://')),
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type SupabaseResult<T> = { data: T; error: unknown };

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

export function unwrap<T>(result: SupabaseResult<T>): T {
  if (result.error) throw result.error;
  return result.data;
}

export function unwrapRows<T>(result: SupabaseResult<T[] | null>): T[] {
  return unwrap(result) ?? [];
}

export function unwrapMaybe<T>(result: SupabaseResult<T | null>): T | null {
  return unwrap(result) ?? null;
}

export function cleanText(value: string | null | undefined, max: number) {
  const clean = (value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
  return clean || null;
}

export const nowIso = () => new Date().toISOString();
