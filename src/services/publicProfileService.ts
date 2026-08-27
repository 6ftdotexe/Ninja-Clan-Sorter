import { supabase } from '../lib/supabase';
import type { ShinobiCharacter } from './characterService';

export type WorldStatItem = { label: string; count: number };
export type WorldStats = {
  public_count: number;
  complete_count: number;
  clans: WorldStatItem[];
  villages: WorldStatItem[];
  chakra: WorldStatItem[];
  ranks: WorldStatItem[];
  summons: WorldStatItem[];
};

const emptyStats: WorldStats = {
  public_count: 0,
  complete_count: 0,
  clans: [],
  villages: [],
  chakra: [],
  ranks: [],
  summons: [],
};

export function makePublicSlug(name: string, id: string) {
  const base = (name || 'shinobi')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'shinobi';
  return `${base}-${id.replace(/-/g, '').slice(0, 8)}`;
}

export async function publishCharacter(character: ShinobiCharacter, bio = '') {
  if (!supabase) throw new Error('Supabase not configured');
  const slug = character.public_slug || makePublicSlug(character.name, character.id);
  const { data, error } = await supabase
    .from('shinobi_characters')
    .update({
      is_public: true,
      public_slug: slug,
      bio: bio.trim().slice(0, 280) || null,
      published_at: character.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', character.id)
    .eq('user_id', character.user_id)
    .select('*')
    .single();
  if (error) throw error;
  return data as ShinobiCharacter;
}

export async function unpublishCharacter(characterId: string, userId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('shinobi_characters')
    .update({ is_public: false, updated_at: new Date().toISOString() })
    .eq('id', characterId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updatePublicBio(characterId: string, userId: string, bio: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('shinobi_characters')
    .update({ bio: bio.trim().slice(0, 280) || null, updated_at: new Date().toISOString() })
    .eq('id', characterId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setActiveCharacter(characterId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('set_active_shinobi', { p_character_id: characterId });
  if (error) throw error;
}

export async function getPublicCharacter(slug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('shinobi_characters')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as ShinobiCharacter | null;
}

export async function listPublicCharacters(limit = 12) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('shinobi_characters')
    .select('*')
    .eq('is_public', true)
    .not('public_slug', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ShinobiCharacter[];
}

export async function getWorldStats(): Promise<WorldStats> {
  if (!supabase) return emptyStats;
  const { data, error } = await supabase.rpc('get_shinobi_world_stats');
  if (error) throw error;
  if (!data || typeof data !== 'object') return emptyStats;
  return { ...emptyStats, ...(data as Partial<WorldStats>) };
}

export async function copyShareUrl(slug: string) {
  const url = `${window.location.origin}${window.location.pathname}#/shinobi/${encodeURIComponent(slug)}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'My Shinobi Identity', text: 'View my Shinobi Identity Archive profile.', url });
      return url;
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') throw error;
      return url;
    }
  }
  await navigator.clipboard.writeText(url);
  return url;
}
