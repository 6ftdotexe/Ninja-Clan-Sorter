-- Shinobi Identity Archive V10 Phase 4
-- Lore, timeline, Bingo Book, and profile customization.
-- Run after v10-phase3.sql. Safe to run once on an existing V9/V10 project.

alter table public.shinobi_characters
  add column if not exists shinobi_alias text,
  add column if not exists profile_title text,
  add column if not exists profile_theme text default 'void',
  add column if not exists banner_url text,
  add column if not exists featured_art_url text;

create table if not exists public.character_lore (
  character_id uuid primary key references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  origin_story text not null default '',
  academy_history text not null default '',
  mentor_history text not null default '',
  turning_point text not null default '',
  current_objective text not null default '',
  personality_summary text not null default '',
  bingo_alias text not null default '',
  threat_rating text not null default '',
  intelligence_notes text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists character_lore_user_idx on public.character_lore(user_id);

create table if not exists public.character_timeline_events (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null default 'custom',
  title text not null,
  detail text not null,
  event_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists character_timeline_character_idx
  on public.character_timeline_events(character_id,event_order);
create index if not exists character_timeline_user_idx
  on public.character_timeline_events(user_id);

alter table public.character_lore enable row level security;
alter table public.character_timeline_events enable row level security;

drop policy if exists "Users can view own lore" on public.character_lore;
create policy "Users can view own lore"
on public.character_lore for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own lore" on public.character_lore;
create policy "Users can create own lore"
on public.character_lore for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.shinobi_characters c
    where c.id = character_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own lore" on public.character_lore;
create policy "Users can update own lore"
on public.character_lore for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lore" on public.character_lore;
create policy "Users can delete own lore"
on public.character_lore for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view published lore" on public.character_lore;
create policy "Public can view published lore"
on public.character_lore for select
using (
  exists (
    select 1 from public.shinobi_characters c
    where c.id = character_id and c.is_public = true
  )
);

drop policy if exists "Users can view own timeline" on public.character_timeline_events;
create policy "Users can view own timeline"
on public.character_timeline_events for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own timeline" on public.character_timeline_events;
create policy "Users can create own timeline"
on public.character_timeline_events for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.shinobi_characters c
    where c.id = character_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own timeline" on public.character_timeline_events;
create policy "Users can update own timeline"
on public.character_timeline_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own timeline" on public.character_timeline_events;
create policy "Users can delete own timeline"
on public.character_timeline_events for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view published timeline" on public.character_timeline_events;
create policy "Public can view published timeline"
on public.character_timeline_events for select
using (
  exists (
    select 1 from public.shinobi_characters c
    where c.id = character_id and c.is_public = true
  )
);
