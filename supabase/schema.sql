-- Shinobi Identity Archive — Current Supabase Schema
-- Single evolving schema for the current release.
-- Run this file in Supabase SQL Editor for a fresh/current installation.
-- Existing installations can safely re-run it because schema changes use
-- IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS where applicable.


-- ============================================================================
-- Source history: v9.sql
-- ============================================================================
-- Shinobi Identity Archive V9 · Accounts + Cloud Archive
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shinobi_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Unnamed Shinobi',
  clan text,
  village text,
  chakra_primary text,
  chakra_secondary text,
  advanced_release text,
  summon text,
  sensei text,
  shadow_mirror text,
  rank text,
  role text,
  leadership text,
  inherited_trait text,
  specialization text,
  portrait_url text,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  is_active boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_test_results (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  result jsonb not null,
  answers jsonb,
  test_length text,
  completed_at timestamptz not null default now(),
  unique(character_id,test_id)
);

alter table public.profiles enable row level security;
alter table public.shinobi_characters enable row level security;
alter table public.character_test_results enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid()=id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid()=id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid()=id);

drop policy if exists "characters_select_own" on public.shinobi_characters;
create policy "characters_select_own" on public.shinobi_characters for select using (auth.uid()=user_id);
drop policy if exists "characters_insert_own" on public.shinobi_characters;
create policy "characters_insert_own" on public.shinobi_characters for insert with check (auth.uid()=user_id);
drop policy if exists "characters_update_own" on public.shinobi_characters;
create policy "characters_update_own" on public.shinobi_characters for update using (auth.uid()=user_id);
drop policy if exists "characters_delete_own" on public.shinobi_characters;
create policy "characters_delete_own" on public.shinobi_characters for delete using (auth.uid()=user_id);

drop policy if exists "results_select_own" on public.character_test_results;
create policy "results_select_own" on public.character_test_results for select using (auth.uid()=user_id);
drop policy if exists "results_insert_own" on public.character_test_results;
create policy "results_insert_own" on public.character_test_results for insert with check (auth.uid()=user_id);
drop policy if exists "results_update_own" on public.character_test_results;
create policy "results_update_own" on public.character_test_results for update using (auth.uid()=user_id);
drop policy if exists "results_delete_own" on public.character_test_results;
create policy "results_delete_own" on public.character_test_results for delete using (auth.uid()=user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();


-- ============================================================================
-- Source history: v9-phase3.sql
-- ============================================================================
-- Shinobi Identity Archive V9 · Phase 3
-- Run AFTER supabase/v9.sql

create table if not exists public.generation_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.shinobi_characters(id) on delete set null,
  status text not null check (status in ('processing','completed','failed')),
  credits_used integer not null default 1 check (credits_used > 0),
  model text not null,
  mode text,
  quality text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

insert into public.generation_wallets(user_id,credits)
select id,0 from auth.users
on conflict(user_id) do nothing;

alter table public.generation_wallets enable row level security;
alter table public.generation_payments enable row level security;
alter table public.generations enable row level security;

drop policy if exists "wallet_select_own" on public.generation_wallets;
create policy "wallet_select_own" on public.generation_wallets
for select using (auth.uid()=user_id);

drop policy if exists "payments_select_own" on public.generation_payments;
create policy "payments_select_own" on public.generation_payments
for select using (auth.uid()=user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
for select using (auth.uid()=user_id);

create or replace function public.grant_generation_credits(p_user_id uuid,p_amount integer)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'credit amount must be positive'; end if;
  insert into public.generation_wallets(user_id,credits)
  values(p_user_id,p_amount)
  on conflict(user_id) do update
  set credits=public.generation_wallets.credits+excluded.credits,
      updated_at=now()
  returning credits into new_balance;
  return new_balance;
end;
$$;

create or replace function public.record_generation_payment(
  p_user_id uuid,
  p_stripe_session_id text,
  p_stripe_payment_intent_id text,
  p_credits integer,
  p_amount_cents integer,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare inserted_count integer;
begin
  if p_credits <= 0 then raise exception 'credit amount must be positive'; end if;
  if p_amount_cents < 0 then raise exception 'payment amount cannot be negative'; end if;

  insert into public.generation_payments(
    user_id,stripe_session_id,stripe_payment_intent_id,credits,amount_cents,currency,status
  ) values(
    p_user_id,p_stripe_session_id,p_stripe_payment_intent_id,p_credits,p_amount_cents,coalesce(nullif(p_currency,''),'usd'),'paid'
  )
  on conflict(stripe_session_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  insert into public.generation_wallets(user_id,credits)
  values(p_user_id,p_credits)
  on conflict(user_id) do update
  set credits=public.generation_wallets.credits+excluded.credits,
      updated_at=now();

  return true;
end;
$$;

create or replace function public.reserve_generation_credits(p_user_id uuid,p_amount integer)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare new_balance integer;
begin
  if p_amount <= 0 then raise exception 'credit amount must be positive'; end if;
  update public.generation_wallets
  set credits=credits-p_amount,updated_at=now()
  where user_id=p_user_id and credits>=p_amount
  returning credits into new_balance;
  if new_balance is null then return -1; end if;
  return new_balance;
end;
$$;

revoke all on function public.grant_generation_credits(uuid,integer) from public,anon,authenticated;
revoke all on function public.reserve_generation_credits(uuid,integer) from public,anon,authenticated;
revoke all on function public.record_generation_payment(uuid,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.grant_generation_credits(uuid,integer) to service_role;
grant execute on function public.reserve_generation_credits(uuid,integer) to service_role;
grant execute on function public.record_generation_payment(uuid,text,text,integer,integer,text) to service_role;

-- Extend the existing signup trigger so every new account receives a wallet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(id) do nothing;

  insert into public.generation_wallets(user_id,credits)
  values(new.id,0)
  on conflict(user_id) do nothing;

  return new;
end;
$$;


-- ============================================================================
-- Source history: v9-phase4.sql
-- ============================================================================
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


-- ============================================================================
-- Source history: v10-phase1.sql
-- ============================================================================
create table if not exists public.jutsu_techniques (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rank text not null check (rank in ('D','C','B','A','S')),
  type text not null,
  chakra_nature text,
  range text,
  role text,
  chakra_cost text,
  description text not null,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  synergies jsonb not null default '[]'::jsonb,
  slot text check (slot is null or slot in ('standard','advanced','signature','ultimate','summoning')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jutsu_techniques enable row level security;
drop policy if exists "Users manage own jutsu" on public.jutsu_techniques;
create policy "Users manage own jutsu" on public.jutsu_techniques for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists jutsu_character_idx on public.jutsu_techniques(character_id,created_at desc);


-- ============================================================================
-- Source history: v10-phase2.sql
-- ============================================================================
-- Shinobi Identity Archive V10 Phase 2
-- Missions, XP, operational rank progression and village reputation.

create table if not exists public.shinobi_progression (
  character_id uuid primary key references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  village_reputation integer not null default 0 check (village_reputation >= 0),
  completed_missions integer not null default 0 check (completed_missions >= 0),
  d_missions integer not null default 0 check (d_missions >= 0),
  c_missions integer not null default 0 check (c_missions >= 0),
  b_missions integer not null default 0 check (b_missions >= 0),
  a_missions integer not null default 0 check (a_missions >= 0),
  s_missions integer not null default 0 check (s_missions >= 0),
  current_title text not null default 'New Operative',
  updated_at timestamptz not null default now()
);

create table if not exists public.shinobi_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  title text not null,
  rank text not null check (rank in ('D','C','B','A','S')),
  category text not null,
  objective text not null,
  briefing text not null,
  location text not null,
  recommended_traits text[] not null default '{}',
  rewards jsonb not null default '{"xp":80,"reputation":8}'::jsonb,
  status text not null default 'accepted' check (status in ('offered','accepted','completed','failed','abandoned')),
  outcome text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create index if not exists shinobi_missions_character_idx on public.shinobi_missions(character_id, created_at desc);
create index if not exists shinobi_missions_user_idx on public.shinobi_missions(user_id, created_at desc);

alter table public.shinobi_progression enable row level security;
alter table public.shinobi_missions enable row level security;

drop policy if exists "Users can view own progression" on public.shinobi_progression;
create policy "Users can view own progression" on public.shinobi_progression for select using (auth.uid() = user_id);
drop policy if exists "Users can create own progression" on public.shinobi_progression;
create policy "Users can create own progression" on public.shinobi_progression for insert with check (auth.uid() = user_id and exists (select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid()));

drop policy if exists "Users can view own missions" on public.shinobi_missions;
create policy "Users can view own missions" on public.shinobi_missions for select using (auth.uid() = user_id);
drop policy if exists "Users can create own missions" on public.shinobi_missions;
create policy "Users can create own missions" on public.shinobi_missions for insert with check (auth.uid() = user_id and exists (select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid()));
drop policy if exists "Users can update own missions" on public.shinobi_missions;
create policy "Users can update own missions" on public.shinobi_missions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.complete_shinobi_mission_v10(
  p_mission_id uuid,
  p_outcome text,
  p_success boolean
)
returns setof public.shinobi_progression
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.shinobi_missions%rowtype;
  reward_xp integer;
  reward_rep integer;
  applied_xp integer;
  new_xp bigint;
  new_rep integer;
  new_level integer;
  new_title text;
begin
  select * into m from public.shinobi_missions
  where id = p_mission_id and user_id = auth.uid() and status = 'accepted'
  for update;
  if not found then raise exception 'Mission is not available for completion.'; end if;

  -- Rewards are derived from the server-owned rank table, never from the client-provided JSON.
  reward_xp := case m.rank when 'D' then 80 when 'C' then 150 when 'B' then 300 when 'A' then 550 when 'S' then 900 else 0 end;
  reward_rep := case m.rank when 'D' then 8 when 'C' then 14 when 'B' then 24 when 'A' then 40 when 'S' then 65 else 0 end;
  applied_xp := case when p_success then reward_xp else greatest(10, floor(reward_xp * 0.25)::integer) end;

  insert into public.shinobi_progression(character_id,user_id)
  values(m.character_id,m.user_id)
  on conflict(character_id) do nothing;

  select xp + applied_xp,
         village_reputation + case when p_success then reward_rep else 0 end
    into new_xp,new_rep
  from public.shinobi_progression
  where character_id=m.character_id and user_id=m.user_id
  for update;

  new_level := greatest(1, floor(sqrt(new_xp::numeric / 70.0))::integer + 1);
  new_title := case
    when new_rep >= 900 then 'Village Legend'
    when new_rep >= 600 then 'Village Pillar'
    when new_rep >= 350 then 'Trusted Elite'
    when new_rep >= 180 then 'Trusted Operative'
    when new_rep >= 75 then 'Proven Shinobi'
    when new_rep >= 25 then 'Reliable Genin'
    else 'New Operative'
  end;

  update public.shinobi_progression set
    xp = new_xp,
    level = new_level,
    village_reputation = new_rep,
    completed_missions = completed_missions + case when p_success then 1 else 0 end,
    d_missions = d_missions + case when p_success and m.rank='D' then 1 else 0 end,
    c_missions = c_missions + case when p_success and m.rank='C' then 1 else 0 end,
    b_missions = b_missions + case when p_success and m.rank='B' then 1 else 0 end,
    a_missions = a_missions + case when p_success and m.rank='A' then 1 else 0 end,
    s_missions = s_missions + case when p_success and m.rank='S' then 1 else 0 end,
    current_title = new_title,
    updated_at = now()
  where character_id=m.character_id and user_id=m.user_id;

  update public.shinobi_missions set
    status = case when p_success then 'completed' else 'failed' end,
    outcome = left(coalesce(p_outcome,''), 2000),
    completed_at = now()
  where id=m.id;

  return query select * from public.shinobi_progression where character_id=m.character_id and user_id=m.user_id;
end;
$$;

revoke all on function public.complete_shinobi_mission_v10(uuid,text,boolean) from public;
grant execute on function public.complete_shinobi_mission_v10(uuid,text,boolean) to authenticated;


-- ============================================================================
-- Source history: v10-phase3.sql
-- ============================================================================
-- Shinobi Identity Archive V10 Phase 3
-- Teams, rivals and matchup history. Run after v10-phase2.sql.

create table if not exists public.shinobi_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shinobi_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.shinobi_teams(id) on delete cascade,
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  position integer not null default 1 check (position between 1 and 4),
  role_label text,
  created_at timestamptz not null default now(),
  unique(team_id, character_id),
  unique(team_id, position)
);

create table if not exists public.shinobi_rivals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  rival_character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  check (character_id <> rival_character_id),
  unique(user_id, character_id, rival_character_id)
);

create table if not exists public.shinobi_matchups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  left_character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  right_character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  winner_character_id uuid references public.shinobi_characters(id) on delete set null,
  analysis jsonb not null,
  created_at timestamptz not null default now(),
  check (left_character_id <> right_character_id)
);

create index if not exists shinobi_team_members_team_idx on public.shinobi_team_members(team_id,position);
create index if not exists shinobi_rivals_user_idx on public.shinobi_rivals(user_id,created_at desc);
create index if not exists shinobi_matchups_user_idx on public.shinobi_matchups(user_id,created_at desc);

alter table public.shinobi_teams enable row level security;
alter table public.shinobi_team_members enable row level security;
alter table public.shinobi_rivals enable row level security;
alter table public.shinobi_matchups enable row level security;

drop policy if exists "Users manage own teams" on public.shinobi_teams;
create policy "Users manage own teams" on public.shinobi_teams for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users view own team members" on public.shinobi_team_members;
create policy "Users view own team members" on public.shinobi_team_members for select using (exists(select 1 from public.shinobi_teams t where t.id=team_id and t.user_id=auth.uid()));
drop policy if exists "Users delete own team members" on public.shinobi_team_members;
create policy "Users delete own team members" on public.shinobi_team_members for delete using (exists(select 1 from public.shinobi_teams t where t.id=team_id and t.user_id=auth.uid()));
drop policy if exists "Users manage own rivals" on public.shinobi_rivals;
create policy "Users manage own rivals" on public.shinobi_rivals for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid()) and exists(select 1 from public.shinobi_characters r where r.id=rival_character_id and (r.user_id=auth.uid() or r.is_public=true)));
drop policy if exists "Users manage own matchup history" on public.shinobi_matchups;
create policy "Users manage own matchup history" on public.shinobi_matchups for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.shinobi_characters l where l.id=left_character_id and (l.user_id=auth.uid() or l.is_public=true)) and exists(select 1 from public.shinobi_characters r where r.id=right_character_id and (r.user_id=auth.uid() or r.is_public=true)));

create or replace function public.add_shinobi_team_member_v10(p_team_id uuid,p_character_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_count integer; v_position integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.shinobi_teams where id=p_team_id and user_id=v_user) then raise exception 'Team not found'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and (user_id=v_user or is_public=true)) then raise exception 'Character is not available'; end if;
  select count(*) into v_count from public.shinobi_team_members where team_id=p_team_id;
  if v_count>=4 then raise exception 'A squad can contain at most four shinobi'; end if;
  if exists(select 1 from public.shinobi_team_members where team_id=p_team_id and character_id=p_character_id) then raise exception 'Shinobi is already on this squad'; end if;
  select coalesce(min(s),1) into v_position from generate_series(1,4) s where not exists(select 1 from public.shinobi_team_members m where m.team_id=p_team_id and m.position=s);
  insert into public.shinobi_team_members(team_id,character_id,position) values(p_team_id,p_character_id,v_position);
  update public.shinobi_teams set updated_at=now() where id=p_team_id;
end;
$$;
revoke all on function public.add_shinobi_team_member_v10(uuid,uuid) from public;
grant execute on function public.add_shinobi_team_member_v10(uuid,uuid) to authenticated;


-- ============================================================================
-- Source history: v10-phase4.sql
-- ============================================================================
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


-- ============================================================================
-- V10.5.0 · Data integrity guardrails
-- Safe normalization for legacy rows plus database-level active-character rule.
-- ============================================================================

-- Empty character names are not useful and were possible in older builds.
update public.shinobi_characters
set name='Unnamed Shinobi', updated_at=now()
where btrim(coalesce(name,''))='';

-- Repair duplicate active flags before enforcing the partial unique index.
with ranked as (
  select id,row_number() over(partition by user_id order by updated_at desc,created_at desc,id) as rn
  from public.shinobi_characters
  where is_active=true
)
update public.shinobi_characters c
set is_active=false,updated_at=now()
from ranked r
where c.id=r.id and r.rn>1;

create unique index if not exists shinobi_one_active_per_user_idx
  on public.shinobi_characters(user_id)
  where is_active=true;

-- Repair missing public slugs using the same name + id strategy as the client.
update public.shinobi_characters
set public_slug=
  coalesce(
    nullif(trim(both '-' from regexp_replace(lower(name),'[^a-z0-9]+','-','g')),''),
    'shinobi'
  ) || '-' || left(replace(id::text,'-',''),8),
  updated_at=now()
where is_public=true and public_slug is null;

-- ============================================================================
-- V10.5.0 · Security and abuse-resistance hardening
-- ============================================================================

-- Public profiles are exposed only through whitelisted SECURITY DEFINER RPCs.
-- This prevents direct clients from selecting private ownership/internal fields
-- from rows that happen to be published.
drop policy if exists "characters_select_public" on public.shinobi_characters;
drop policy if exists "Public can view published lore" on public.character_lore;
drop policy if exists "Public can view published timeline" on public.character_timeline_events;

create or replace function public._public_shinobi_json(c public.shinobi_characters)
returns jsonb
language sql
stable
set search_path=public
as $$
  select jsonb_build_object(
    'id',c.id,
    'user_id',null,
    'name',c.name,
    'clan',c.clan,
    'village',c.village,
    'chakra_primary',c.chakra_primary,
    'chakra_secondary',c.chakra_secondary,
    'advanced_release',c.advanced_release,
    'summon',c.summon,
    'sensei',c.sensei,
    'shadow_mirror',c.shadow_mirror,
    'rank',c.rank,
    'role',c.role,
    'leadership',c.leadership,
    'inherited_trait',c.inherited_trait,
    'specialization',c.specialization,
    'portrait_url',c.portrait_url,
    'completion_percent',c.completion_percent,
    'is_active',false,
    'is_public',c.is_public,
    'public_slug',c.public_slug,
    'bio',c.bio,
    'published_at',c.published_at,
    'shinobi_alias',c.shinobi_alias,
    'profile_title',c.profile_title,
    'profile_theme',c.profile_theme,
    'banner_url',c.banner_url,
    'featured_art_url',c.featured_art_url,
    'created_at',c.created_at,
    'updated_at',c.updated_at
  );
$$;
revoke all on function public._public_shinobi_json(public.shinobi_characters) from public,anon,authenticated;

create or replace function public.get_public_shinobi_by_slug(p_slug text)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select public._public_shinobi_json(c)
  from public.shinobi_characters c
  where c.is_public=true and c.public_slug is not null and char_length(coalesce(p_slug,'')) between 1 and 80 and c.public_slug=p_slug
  limit 1;
$$;

create or replace function public.list_public_shinobi(p_limit integer default 12)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(public._public_shinobi_json(c) order by c.published_at desc nulls last,c.updated_at desc),'[]'::jsonb)
  from (
    select * from public.shinobi_characters
    where is_public=true and public_slug is not null
    order by published_at desc nulls last,updated_at desc
    limit least(100,greatest(1,coalesce(p_limit,12)))
  ) c;
$$;

create or replace function public.get_public_shinobi_by_ids(p_ids uuid[])
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(public._public_shinobi_json(c) order by c.updated_at desc),'[]'::jsonb)
  from public.shinobi_characters c
  where c.is_public=true and c.id=any(coalesce(p_ids[1:100],array[]::uuid[]));
$$;

create or replace function public.get_public_shinobi_lore(p_character_id uuid)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select jsonb_build_object(
    'character_id',l.character_id,
    'user_id',null,
    'origin_story',l.origin_story,
    'academy_history',l.academy_history,
    'mentor_history',l.mentor_history,
    'turning_point',l.turning_point,
    'current_objective',l.current_objective,
    'personality_summary',l.personality_summary,
    'bingo_alias',l.bingo_alias,
    'threat_rating',l.threat_rating,
    'intelligence_notes',l.intelligence_notes,
    'updated_at',l.updated_at
  )
  from public.character_lore l
  join public.shinobi_characters c on c.id=l.character_id
  where l.character_id=p_character_id and c.is_public=true
  limit 1;
$$;

create or replace function public.get_public_shinobi_timeline(p_character_id uuid)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,
    'character_id',e.character_id,
    'user_id',null,
    'event_type',e.event_type,
    'title',e.title,
    'detail',e.detail,
    'event_order',e.event_order,
    'created_at',e.created_at
  ) order by e.event_order,e.created_at),'[]'::jsonb)
  from public.character_timeline_events e
  join public.shinobi_characters c on c.id=e.character_id
  where e.character_id=p_character_id and c.is_public=true;
$$;

revoke all on function public.get_public_shinobi_by_slug(text) from public;
revoke all on function public.list_public_shinobi(integer) from public;
revoke all on function public.get_public_shinobi_by_ids(uuid[]) from public;
revoke all on function public.get_public_shinobi_lore(uuid) from public;
revoke all on function public.get_public_shinobi_timeline(uuid) from public;
grant execute on function public.get_public_shinobi_by_slug(text) to anon,authenticated;
grant execute on function public.list_public_shinobi(integer) to anon,authenticated;
grant execute on function public.get_public_shinobi_by_ids(uuid[]) to anon,authenticated;
grant execute on function public.get_public_shinobi_lore(uuid) to anon,authenticated;
grant execute on function public.get_public_shinobi_timeline(uuid) to anon,authenticated;

-- Security-definer helper used inside social RLS policies. It exposes only a
-- boolean decision and never returns the target row.
create or replace function public.can_access_shinobi(p_character_id uuid)
returns boolean
language sql
security definer
set search_path=public
stable
as $$
  select exists(
    select 1 from public.shinobi_characters c
    where c.id=p_character_id and (c.user_id=auth.uid() or c.is_public=true)
  );
$$;
revoke all on function public.can_access_shinobi(uuid) from public,anon;
grant execute on function public.can_access_shinobi(uuid) to authenticated;

-- Rebuild social write checks without requiring direct SELECT access to public
-- character rows.
drop policy if exists "Users manage own rivals" on public.shinobi_rivals;
create policy "Users manage own rivals" on public.shinobi_rivals for all
using (auth.uid()=user_id)
with check (
  auth.uid()=user_id
  and public.can_access_shinobi(character_id)
  and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid())
  and public.can_access_shinobi(rival_character_id)
);

drop policy if exists "Users manage own matchup history" on public.shinobi_matchups;
create policy "Users manage own matchup history" on public.shinobi_matchups for all
using (auth.uid()=user_id)
with check (
  auth.uid()=user_id
  and public.can_access_shinobi(left_character_id)
  and public.can_access_shinobi(right_character_id)
);

-- Make ownership checks explicit on updates. This prevents future policy edits
-- from accidentally allowing user_id/character_id reassignment.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
drop policy if exists "characters_update_own" on public.shinobi_characters;
create policy "characters_update_own" on public.shinobi_characters for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "results_update_own" on public.character_test_results;
create policy "results_update_own" on public.character_test_results for update using (auth.uid()=user_id) with check (
  auth.uid()=user_id and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid())
);

-- Public execution is granted by default for new PostgreSQL functions. Keep all
-- mutation/security-definer functions explicitly closed unless needed.
revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.set_active_shinobi(uuid) from public,anon;
grant execute on function public.set_active_shinobi(uuid) to authenticated;

-- Limit an account to one active image-generation job at a time. Resolve any
-- legacy duplicates before enforcing the partial unique index.
with ranked as (
  select id,row_number() over(partition by user_id order by created_at desc,id) as rn
  from public.generations where status='processing'
)
update public.generations g
set status='failed',completed_at=coalesce(g.completed_at,now()),error_message=coalesce(g.error_message,'Closed during V10.5.0 concurrency hardening.')
from ranked r
where g.id=r.id and r.rn>1;

create unique index if not exists generations_one_processing_per_user_idx
  on public.generations(user_id)
  where status='processing';

-- Progression rows created from the browser must begin at the canonical zero
-- state. Progression increases happen only inside the mission-completion RPC.
drop policy if exists "Users can create own progression" on public.shinobi_progression;
create policy "Users can create own progression" on public.shinobi_progression for insert
with check (
  auth.uid()=user_id
  and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid())
  and xp=0 and level=1 and village_reputation=0 and completed_missions=0
  and d_missions=0 and c_missions=0 and b_missions=0 and a_missions=0 and s_missions=0
  and current_title='New Operative'
);

create or replace function public.can_accept_mission_rank(p_character_id uuid,p_rank text)
returns boolean
language plpgsql
security definer
set search_path=public
stable
as $$
declare
  v_level integer:=1;
  v_rank_index integer;
  v_max_index integer;
begin
  if auth.uid() is null then return false; end if;
  if not exists(select 1 from public.shinobi_characters c where c.id=p_character_id and c.user_id=auth.uid()) then return false; end if;
  select coalesce(level,1) into v_level from public.shinobi_progression where character_id=p_character_id and user_id=auth.uid();
  v_level:=coalesce(v_level,1);
  v_rank_index:=case p_rank when 'D' then 0 when 'C' then 1 when 'B' then 2 when 'A' then 3 when 'S' then 4 else 99 end;
  v_max_index:=case when v_level>=28 then 4 when v_level>=20 then 3 when v_level>=12 then 2 when v_level>=5 then 1 else 0 end;
  -- The mission generator intentionally permits an occasional one-rank stretch assignment.
  return v_rank_index<=least(4,v_max_index+1);
end;
$$;
revoke all on function public.can_accept_mission_rank(uuid,text) from public,anon;
grant execute on function public.can_accept_mission_rank(uuid,text) to authenticated;

drop policy if exists "Users can create own missions" on public.shinobi_missions;
create policy "Users can create own missions" on public.shinobi_missions for insert
with check (
  auth.uid()=user_id
  and public.can_accept_mission_rank(character_id,rank)
  and char_length(title) between 1 and 120
  and char_length(category) between 1 and 60
  and char_length(objective) between 1 and 600
  and char_length(briefing) between 1 and 2000
  and char_length(location) between 1 and 160
  and octet_length(rewards::text)<=2048
  and cardinality(recommended_traits)<=10
  and octet_length(array_to_string(recommended_traits,''))<=1000
);

-- Browser clients only need to abandon/update lifecycle fields. Mission rank,
-- rewards, ownership, and descriptive data are immutable after insertion.
revoke update on public.shinobi_missions from authenticated;
grant update(status,outcome,accepted_at,completed_at) on public.shinobi_missions to authenticated;

-- ============================================================================
-- V10.5.0 · Performance and scalability hardening
-- ============================================================================

-- Query-path indexes used by archive lists, discovery, generation history, and
-- social hydration. Partial discovery index keeps the public-world hot path small.
create index if not exists shinobi_characters_user_updated_idx
  on public.shinobi_characters(user_id,updated_at desc,id);
create index if not exists character_test_results_character_completed_idx
  on public.character_test_results(character_id,completed_at desc);
create index if not exists shinobi_public_discovery_idx
  on public.shinobi_characters((coalesce(published_at,updated_at)) desc,id desc)
  where is_public=true and public_slug is not null;
create index if not exists generations_user_created_idx
  on public.generations(user_id,created_at desc);
create index if not exists generation_payments_user_created_idx
  on public.generation_payments(user_id,created_at desc);
create index if not exists shinobi_team_members_character_idx
  on public.shinobi_team_members(character_id,team_id);
create index if not exists shinobi_rivals_character_lookup_idx
  on public.shinobi_rivals(user_id,character_id,rival_character_id);

-- Cursor-based public discovery avoids increasingly expensive OFFSET scans.
create or replace function public.list_public_shinobi_page(
  p_limit integer default 12,
  p_before timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  with settings as (
    select least(48,greatest(1,coalesce(p_limit,12))) as page_size
  ), candidates as (
    select c.*,coalesce(c.published_at,c.updated_at) as sort_at
    from public.shinobi_characters c,settings s
    where c.is_public=true and c.public_slug is not null
      and (
        p_before is null
        or coalesce(c.published_at,c.updated_at) < p_before
        or (coalesce(c.published_at,c.updated_at)=p_before and p_before_id is not null and c.id < p_before_id)
      )
    order by sort_at desc,c.id desc
    limit (select page_size+1 from settings)
  ), visible as (
    select * from candidates
    order by sort_at desc,id desc
    limit (select page_size from settings)
  ), cursor_row as (
    select sort_at,id from visible order by sort_at asc,id asc limit 1
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(public._public_shinobi_json(c) order by v.sort_at desc,v.id desc) from visible v join public.shinobi_characters c on c.id=v.id),'[]'::jsonb),
    'has_more',(select count(*) from candidates)>(select page_size from settings),
    'next_before',(select sort_at from cursor_row),
    'next_before_id',(select id from cursor_row)
  );
$$;
revoke all on function public.list_public_shinobi_page(integer,timestamptz,uuid) from public;
grant execute on function public.list_public_shinobi_page(integer,timestamptz,uuid) to anon,authenticated;

-- One public-profile RPC replaces the character + lore + timeline client round trips.
create or replace function public.get_public_shinobi_profile_bundle(p_slug text)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select jsonb_build_object(
    'character',public._public_shinobi_json(c),
    'lore',public.get_public_shinobi_lore(c.id),
    'timeline',public.get_public_shinobi_timeline(c.id)
  )
  from public.shinobi_characters c
  where c.is_public=true and c.public_slug is not null
    and char_length(coalesce(p_slug,'')) between 1 and 80
    and c.public_slug=p_slug
  limit 1;
$$;
revoke all on function public.get_public_shinobi_profile_bundle(text) from public;
grant execute on function public.get_public_shinobi_profile_bundle(text) to anon,authenticated;

-- Cache aggregate world statistics for a few minutes. Public profile writes are
-- infrequent compared with reads, so bounded staleness is a better scaling tradeoff.
create table if not exists public.shinobi_world_stats_cache (
  cache_key text primary key,
  payload jsonb not null,
  refreshed_at timestamptz not null default now()
);
alter table public.shinobi_world_stats_cache enable row level security;
revoke all on public.shinobi_world_stats_cache from anon,authenticated;

create or replace function public._compute_shinobi_world_stats()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select jsonb_build_object(
    'public_count',count(*)::int,
    'complete_count',count(*) filter(where completion_percent=100)::int,
    'clans',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',total) order by total desc,label) from (select clan label,count(*)::int total from public.shinobi_characters where is_public=true and clan is not null and clan<>'' group by clan order by total desc,clan limit 12) x),'[]'::jsonb),
    'villages',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',total) order by total desc,label) from (select village label,count(*)::int total from public.shinobi_characters where is_public=true and village is not null and village<>'' group by village order by total desc,village limit 12) x),'[]'::jsonb),
    'chakra',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',total) order by total desc,label) from (select chakra_primary label,count(*)::int total from public.shinobi_characters where is_public=true and chakra_primary is not null and chakra_primary<>'' group by chakra_primary order by total desc,chakra_primary limit 10) x),'[]'::jsonb),
    'ranks',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',total) order by total desc,label) from (select rank label,count(*)::int total from public.shinobi_characters where is_public=true and rank is not null and rank<>'' group by rank order by total desc,rank limit 10) x),'[]'::jsonb),
    'summons',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',total) order by total desc,label) from (select summon label,count(*)::int total from public.shinobi_characters where is_public=true and summon is not null and summon<>'' group by summon order by total desc,summon limit 10) x),'[]'::jsonb)
  )
  from public.shinobi_characters
  where is_public=true;
$$;
revoke all on function public._compute_shinobi_world_stats() from public,anon,authenticated;

create or replace function public.get_shinobi_world_stats()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payload jsonb;
  v_refreshed timestamptz;
begin
  select payload,refreshed_at into v_payload,v_refreshed
  from public.shinobi_world_stats_cache where cache_key='world';
  if v_payload is not null and v_refreshed > now()-interval '5 minutes' then
    return v_payload;
  end if;
  v_payload:=public._compute_shinobi_world_stats();
  insert into public.shinobi_world_stats_cache(cache_key,payload,refreshed_at)
  values('world',v_payload,now())
  on conflict(cache_key) do update set payload=excluded.payload,refreshed_at=excluded.refreshed_at;
  return v_payload;
end;
$$;
revoke all on function public.get_shinobi_world_stats() from public;
grant execute on function public.get_shinobi_world_stats() to anon,authenticated;

-- Distributed rate-limit state for costly API routes. This makes throttles work
-- consistently across multiple Render/Node instances while retaining local fallback.
create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check(request_count>=0),
  updated_at timestamptz not null default now()
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon,authenticated;
create index if not exists api_rate_limits_updated_idx on public.api_rate_limits(updated_at);

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_start timestamptz;
  v_count integer;
  v_window integer:=least(86400,greatest(1,coalesce(p_window_seconds,60)));
  v_limit integer:=least(10000,greatest(1,coalesce(p_limit,60)));
begin
  if p_key is null or char_length(p_key)<1 or char_length(p_key)>220 then
    raise exception 'invalid rate-limit key';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_key));
  select window_started_at,request_count into v_start,v_count
  from public.api_rate_limits where rate_key=p_key for update;
  if v_start is null or v_start + make_interval(secs=>v_window) <= v_now then
    v_start:=v_now;
    v_count:=1;
    insert into public.api_rate_limits(rate_key,window_started_at,request_count,updated_at)
    values(p_key,v_start,v_count,v_now)
    on conflict(rate_key) do update set window_started_at=excluded.window_started_at,request_count=excluded.request_count,updated_at=excluded.updated_at;
  else
    v_count:=v_count+1;
    update public.api_rate_limits set request_count=v_count,updated_at=v_now where rate_key=p_key;
  end if;
  if random()<0.01 then
    delete from public.api_rate_limits where updated_at < v_now-interval '2 days';
  end if;
  return jsonb_build_object(
    'allowed',v_count<=v_limit,
    'remaining',greatest(0,v_limit-v_count),
    'reset_at',v_start+make_interval(secs=>v_window)
  );
end;
$$;
revoke all on function public.consume_api_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;

-- Authenticated social hydration in one RPC: owned characters retain owner data,
-- while other users' public characters are returned through the public whitelist.
create or replace function public.get_accessible_shinobi_by_ids(p_ids uuid[])
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(
    case when c.user_id=auth.uid() then to_jsonb(c) else public._public_shinobi_json(c) end
    order by c.updated_at desc
  ),'[]'::jsonb)
  from public.shinobi_characters c
  where auth.uid() is not null
    and c.id=any(coalesce(p_ids[1:100],array[]::uuid[]))
    and (c.user_id=auth.uid() or c.is_public=true);
$$;
revoke all on function public.get_accessible_shinobi_by_ids(uuid[]) from public,anon;
grant execute on function public.get_accessible_shinobi_by_ids(uuid[]) to authenticated;

-- ============================================================================
-- Release metadata — V10.5.0+
-- The application uses this to verify that the deployed server and database
-- schema were rolled out together before reporting readiness.
-- ============================================================================
create table if not exists public.app_release_metadata (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_release_metadata enable row level security;
revoke all on public.app_release_metadata from public,anon,authenticated;

insert into public.app_release_metadata(key,value,updated_at)
values('schema_version','10.5.0',now())
on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;

create or replace function public.get_app_schema_version()
returns text
language sql
security definer
set search_path=public
stable
as $$
  select value from public.app_release_metadata where key='schema_version';
$$;
revoke all on function public.get_app_schema_version() from public,anon,authenticated;
grant execute on function public.get_app_schema_version() to service_role;
