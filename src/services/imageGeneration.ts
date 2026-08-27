import type { GeneratorRequest, GeneratorResponse } from '../types/generator';
import { supabase } from '../lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const result = await supabase?.auth.getSession();
  const token = result?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function generateShinobiImage(payload: GeneratorRequest): Promise<GeneratorResponse> {
  const r = await fetch('/api/generate-shinobi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `Generation failed (${r.status})`);
  return data as GeneratorResponse;
}

export async function getGenerationCredits(): Promise<number> {
  const r = await fetch('/api/credits', { headers: await authHeaders() });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'Could not load generation credits.');
  return Number(data.credits || 0);
}

export async function createGenerationCheckout(packId: 'single' | 'triple' | 'ten'): Promise<string> {
  const r = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ packId }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.url) throw new Error(data?.error || 'Could not start checkout.');
  return String(data.url);
}
