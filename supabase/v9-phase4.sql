-- Shinobi Identity Archive V9 · Phase 4
-- Public profiles, sharing, discovery, and world statistics
-- Run AFTER supabase/v9.sql and supabase/v9-phase3.sql

alter table public.shinobi_characters
  add column if not exists public_slug text,
  add column if not exists bio text,
  add column if not exists published_at timestamptz;

create unique index if not exists shinobi_characters_public_slug_key
  on public.shinobi_characters(public_slug)
  where public_slug is not null;

-- Owners can already read their own characters. This policy additionally lets
-- anonymous/authenticated visitors read only explicitly public characters.
drop policy if exists "characters_select_public" on public.shinobi_characters;
create policy "characters_select_public"
on public.shinobi_characters
for select
using (is_public = true and public_slug is not null);

-- Public world stats are intentionally aggregated from public characters only.
create or replace function public.get_shinobi_world_stats()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select jsonb_build_object(
    'public_count', (select count(*) from public.shinobi_characters where is_public = true),
    'complete_count', (select count(*) from public.shinobi_characters where is_public = true and completion_percent = 100),
    'clans', coalesce((
      select jsonb_agg(jsonb_build_object('label', clan, 'count', total) order by total desc, clan)
      from (
        select clan, count(*)::int as total
        from public.shinobi_characters
        where is_public = true and clan is not null and clan <> ''
        group by clan
        order by total desc, clan
        limit 12
      ) s
    ), '[]'::jsonb),
    'villages', coalesce((
      select jsonb_agg(jsonb_build_object('label', village, 'count', total) order by total desc, village)
      from (
        select village, count(*)::int as total
        from public.shinobi_characters
        where is_public = true and village is not null and village <> ''
        group by village
        order by total desc, village
        limit 12
      ) s
    ), '[]'::jsonb),
    'chakra', coalesce((
      select jsonb_agg(jsonb_build_object('label', chakra_primary, 'count', total) order by total desc, chakra_primary)
      from (
        select chakra_primary, count(*)::int as total
        from public.shinobi_characters
        where is_public = true and chakra_primary is not null and chakra_primary <> ''
        group by chakra_primary
        order by total desc, chakra_primary
        limit 10
      ) s
    ), '[]'::jsonb),
    'ranks', coalesce((
      select jsonb_agg(jsonb_build_object('label', rank, 'count', total) order by total desc, rank)
      from (
        select rank, count(*)::int as total
        from public.shinobi_characters
        where is_public = true and rank is not null and rank <> ''
        group by rank
        order by total desc, rank
        limit 10
      ) s
    ), '[]'::jsonb),
    'summons', coalesce((
      select jsonb_agg(jsonb_build_object('label', summon, 'count', total) order by total desc, summon)
      from (
        select summon, count(*)::int as total
        from public.shinobi_characters
        where is_public = true and summon is not null and summon <> ''
        group by summon
        order by total desc, summon
        limit 10
      ) s
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_shinobi_world_stats() from public;
grant execute on function public.get_shinobi_world_stats() to anon, authenticated;

-- Helper to enforce one active character per user. Owners invoke this from the client.
create or replace function public.set_active_shinobi(p_character_id uuid)
returns void
language plpgsql
security invoker
set search_path=public
as $$
declare owner_id uuid;
begin
  select user_id into owner_id
  from public.shinobi_characters
  where id = p_character_id and user_id = auth.uid();

  if owner_id is null then
    raise exception 'Character not found';
  end if;

  update public.shinobi_characters
  set is_active = false, updated_at = now()
  where user_id = auth.uid() and is_active = true;

  update public.shinobi_characters
  set is_active = true, updated_at = now()
  where id = p_character_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_active_shinobi(uuid) to authenticated;
