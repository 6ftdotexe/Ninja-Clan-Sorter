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
-- V11 Phase 1 — Living Villages + Shinobi Career
-- ============================================================================
create table if not exists public.village_memberships (
  character_id uuid primary key references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  village_id text not null check (village_id in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.village_memberships enable row level security;
create index if not exists village_memberships_village_idx on public.village_memberships(village_id,updated_at desc);
create index if not exists village_memberships_user_idx on public.village_memberships(user_id,updated_at desc);

drop policy if exists "village_memberships_select_own" on public.village_memberships;
create policy "village_memberships_select_own" on public.village_memberships for select using (auth.uid()=user_id);
drop policy if exists "village_memberships_insert_own" on public.village_memberships;
create policy "village_memberships_insert_own" on public.village_memberships for insert with check (auth.uid()=user_id and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid()));
drop policy if exists "village_memberships_update_own" on public.village_memberships;
create policy "village_memberships_update_own" on public.village_memberships for update using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid()));
drop policy if exists "village_memberships_delete_own" on public.village_memberships;
create policy "village_memberships_delete_own" on public.village_memberships for delete using (auth.uid()=user_id);

-- join_village changed return type during V11 development. PostgreSQL cannot
-- CREATE OR REPLACE a function with a different return type, so explicitly
-- drop the old signature before recreating the canonical row-returning RPC.
drop function if exists public.join_village(uuid,text);

create or replace function public.join_village(p_character_id uuid,p_village_id text)
returns public.village_memberships
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_row public.village_memberships%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_village_id not in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure') then raise exception 'invalid village'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'character unavailable'; end if;
  insert into public.village_memberships(character_id,user_id,village_id,joined_at,updated_at)
  values(p_character_id,v_user,p_village_id,now(),now())
  on conflict(character_id) do update set village_id=excluded.village_id,user_id=excluded.user_id,joined_at=case when public.village_memberships.village_id=excluded.village_id then public.village_memberships.joined_at else now() end,updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.join_village(uuid,text) from public,anon;
grant execute on function public.join_village(uuid,text) to authenticated;

create or replace function public.leave_village(p_character_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  delete from public.village_memberships where character_id=p_character_id and user_id=v_user;
  get diagnostics v_count=row_count;
  return v_count>0;
end;
$$;
revoke all on function public.leave_village(uuid) from public,anon;
grant execute on function public.leave_village(uuid) to authenticated;

create or replace function public._village_summary(p_village_id text)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  with stats as (
    select
      count(*)::int member_count,
      count(*) filter(where c.is_public=true)::int public_members,
      coalesce(sum(p.village_reputation),0)::int total_reputation,
      coalesce(round(avg(coalesce(p.level,1))),1)::numeric average_level,
      coalesce(sum(p.completed_missions),0)::int completed_missions
    from public.village_memberships vm
    join public.shinobi_characters c on c.id=vm.character_id
    left join public.shinobi_progression p on p.character_id=vm.character_id
    where vm.village_id=p_village_id
  )
  select jsonb_build_object(
    'village_id',p_village_id,
    'member_count',member_count,
    'public_members',public_members,
    'total_reputation',total_reputation,
    'average_level',average_level,
    'completed_missions',completed_missions,
    'village_level',greatest(1,floor(sqrt(greatest(0,total_reputation)::numeric/250))+1)::int,
    'standing_score',(total_reputation + completed_missions*15 + public_members*10)::int
  ) from stats;
$$;
revoke all on function public._village_summary(text) from public,anon,authenticated;

create or replace function public.list_village_directory()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select jsonb_agg(public._village_summary(village_id) order by ((public._village_summary(village_id)->>'standing_score')::int) desc)
  from (values ('Konohagakure'),('Sunagakure'),('Kumogakure'),('Iwagakure'),('Kirigakure')) v(village_id);
$$;
revoke all on function public.list_village_directory() from public;
grant execute on function public.list_village_directory() to anon,authenticated;

create or replace function public.get_village_profile(p_village_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
declare v_members jsonb;
begin
  if p_village_id not in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure') then return null; end if;
  select coalesce(jsonb_agg(member_payload order by reputation desc,updated_at desc),'[]'::jsonb)
  into v_members
  from (
    select jsonb_build_object(
      'character',public._public_shinobi_json(c),
      'level',coalesce(p.level,1),
      'reputation',coalesce(p.village_reputation,0),
      'completed_missions',coalesce(p.completed_missions,0),
      'title',coalesce(p.current_title,'New Operative')
    ) member_payload,
    coalesce(p.village_reputation,0) reputation,
    c.updated_at
    from public.village_memberships vm
    join public.shinobi_characters c on c.id=vm.character_id and c.is_public=true
    left join public.shinobi_progression p on p.character_id=vm.character_id
    where vm.village_id=p_village_id
    order by coalesce(p.village_reputation,0) desc,c.updated_at desc
    limit 60
  ) roster;
  return jsonb_build_object('summary',public._village_summary(p_village_id),'members',v_members);
end;
$$;
revoke all on function public.get_village_profile(text) from public;
grant execute on function public.get_village_profile(text) to anon,authenticated;

create or replace function public._career_json(p_character_id uuid)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  with base as (
    select c.id,c.rank,
      vm.village_id,vm.joined_at,
      coalesce(p.xp,0)::int xp,coalesce(p.level,1)::int level,coalesce(p.village_reputation,0)::int village_reputation,
      coalesce(p.completed_missions,0)::int completed_missions,coalesce(p.d_missions,0)::int d_missions,coalesce(p.c_missions,0)::int c_missions,
      coalesce(p.b_missions,0)::int b_missions,coalesce(p.a_missions,0)::int a_missions,coalesce(p.s_missions,0)::int s_missions,
      coalesce(p.current_title,'New Operative') current_title,
      count(m.id) filter(where m.status='completed')::int mission_successes,
      count(m.id) filter(where m.status='failed')::int mission_failures,
      count(m.id) filter(where m.status='abandoned')::int mission_abandoned
    from public.shinobi_characters c
    left join public.village_memberships vm on vm.character_id=c.id
    left join public.shinobi_progression p on p.character_id=c.id
    left join public.shinobi_missions m on m.character_id=c.id
    where c.id=p_character_id
    group by c.id,c.rank,vm.village_id,vm.joined_at,p.xp,p.level,p.village_reputation,p.completed_missions,p.d_missions,p.c_missions,p.b_missions,p.a_missions,p.s_missions,p.current_title
  ), ranked as (
    select *,case
      when level>=40 and completed_missions>=60 and s_missions>=3 and lower(coalesce(rank,'')) ~ '(kagepotential|kage potential|legendary)' then 'Kage'
      when level>=30 and completed_missions>=40 and a_missions>=6 then 'Kage Candidate'
      when level>=22 and completed_missions>=25 and a_missions>=2 then 'Elite Jōnin'
      when level>=15 and completed_missions>=15 and b_missions>=3 then 'Jōnin'
      when level>=10 and completed_missions>=8 and b_missions>=1 then 'Special Jōnin'
      when level>=5 and completed_missions>=3 then 'Chūnin'
      else 'Genin' end operational_rank
    from base
  )
  select jsonb_build_object(
    'character_id',id,'village_id',village_id,'joined_at',joined_at,'xp',xp,'level',level,'village_reputation',village_reputation,
    'completed_missions',completed_missions,'d_missions',d_missions,'c_missions',c_missions,'b_missions',b_missions,'a_missions',a_missions,'s_missions',s_missions,
    'current_title',current_title,'mission_successes',mission_successes,'mission_failures',mission_failures,'mission_abandoned',mission_abandoned,
    'success_rate',case when mission_successes+mission_failures=0 then 0 else round(mission_successes::numeric/(mission_successes+mission_failures)*100)::int end,
    'operational_rank',operational_rank,
    'next_milestone',case operational_rank
      when 'Genin' then 'Reach level 5 and complete 3 missions to qualify for Chūnin.'
      when 'Chūnin' then 'Reach level 10, complete 8 missions, and finish a B-rank mission.'
      when 'Special Jōnin' then 'Reach level 15, complete 15 missions, and finish 3 B-rank missions.'
      when 'Jōnin' then 'Reach level 22, complete 25 missions, and finish 2 A-rank missions.'
      when 'Elite Jōnin' then 'Reach level 30, complete 40 missions, and finish 6 A-rank missions.'
      when 'Kage Candidate' then 'Reach level 40, 60 missions, 3 S-rank missions, and Kage/Legendary potential.'
      else 'You have reached the highest current field rank.' end
  ) from ranked;
$$;
revoke all on function public._career_json(uuid) from public,anon,authenticated;

create or replace function public.get_shinobi_career(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then return null; end if;
  return public._career_json(p_character_id);
end;
$$;
revoke all on function public.get_shinobi_career(uuid) from public,anon;
grant execute on function public.get_shinobi_career(uuid) to authenticated;

create or replace function public.get_public_shinobi_career(p_slug text)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select public._career_json(c.id) from public.shinobi_characters c
  where c.is_public=true and c.public_slug=p_slug and char_length(coalesce(p_slug,'')) between 1 and 80
  limit 1;
$$;
revoke all on function public.get_public_shinobi_career(text) from public;
grant execute on function public.get_public_shinobi_career(text) to anon,authenticated;

-- ============================================================================
-- V11 Phase 2 · Training, jutsu mastery, and equipment progression
-- ============================================================================
alter table public.shinobi_progression add column if not exists training_points integer not null default 0 check (training_points>=0);
alter table public.shinobi_progression add column if not exists ryo integer not null default 0 check (ryo>=0);
alter table public.shinobi_progression add column if not exists training_bonuses jsonb not null default '{}'::jsonb;

-- Browser-created progression rows must still begin at a true zero state now
-- that Phase 2 adds spendable resources and permanent training bonuses.
drop policy if exists "Users can create own progression" on public.shinobi_progression;
create policy "Users can create own progression" on public.shinobi_progression for insert
with check (
  auth.uid()=user_id
  and exists(select 1 from public.shinobi_characters c where c.id=character_id and c.user_id=auth.uid())
  and xp=0 and level=1 and village_reputation=0 and completed_missions=0
  and d_missions=0 and c_missions=0 and b_missions=0 and a_missions=0 and s_missions=0
  and current_title='New Operative' and training_points=0 and ryo=0 and training_bonuses='{}'::jsonb
);

alter table public.jutsu_techniques add column if not exists mastery_xp integer not null default 0 check (mastery_xp>=0);
alter table public.jutsu_techniques add column if not exists mastery_level integer not null default 1 check (mastery_level between 1 and 5);
-- Mastery is server-authoritative. Browser clients may still change loadout slots.
revoke update on public.jutsu_techniques from authenticated;
grant update(slot) on public.jutsu_techniques to authenticated;

create table if not exists public.shinobi_equipment (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  slot text not null check(slot in ('weapon','armor','tool','accessory')),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,item_id)
);
alter table public.shinobi_equipment enable row level security;
create index if not exists shinobi_equipment_character_idx on public.shinobi_equipment(character_id,acquired_at desc);
create unique index if not exists shinobi_equipment_one_equipped_per_slot_idx on public.shinobi_equipment(character_id,slot) where equipped=true;
drop policy if exists "shinobi_equipment_select_own" on public.shinobi_equipment;
create policy "shinobi_equipment_select_own" on public.shinobi_equipment for select using(auth.uid()=user_id);
revoke insert,update,delete on public.shinobi_equipment from authenticated;

create or replace function public.get_shinobi_training(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
declare v public.shinobi_progression%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then return null; end if;
  select * into v from public.shinobi_progression where character_id=p_character_id and user_id=auth.uid();
  return jsonb_build_object(
    'character_id',p_character_id,
    'training_points',coalesce(v.training_points,0),
    'ryo',coalesce(v.ryo,0),
    'bonuses',coalesce(v.training_bonuses,'{}'::jsonb)
  );
end;
$$;
revoke all on function public.get_shinobi_training(uuid) from public,anon;
grant execute on function public.get_shinobi_training(uuid) to authenticated;

create or replace function public.train_shinobi_stat(p_character_id uuid,p_stat text,p_sessions integer default 1)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.shinobi_progression%rowtype;
  current_bonus integer;
  next_bonus integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_stat not in ('ninjutsu','taijutsu','genjutsu','intelligence','speed','strength','stamina','chakraControl','leadership','adaptability') then raise exception 'Unknown training stat.'; end if;
  if p_sessions<1 or p_sessions>5 then raise exception 'Training sessions must be between 1 and 5.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then raise exception 'Character not found.'; end if;
  insert into public.shinobi_progression(character_id,user_id) values(p_character_id,auth.uid()) on conflict(character_id) do nothing;
  select * into v from public.shinobi_progression where character_id=p_character_id and user_id=auth.uid() for update;
  if v.training_points<p_sessions then raise exception 'Not enough training points.'; end if;
  current_bonus:=coalesce((v.training_bonuses->>p_stat)::integer,0);
  next_bonus:=least(15,current_bonus+p_sessions);
  if next_bonus=current_bonus then raise exception 'This stat has reached its training cap.'; end if;
  update public.shinobi_progression set
    training_points=training_points-(next_bonus-current_bonus),
    training_bonuses=jsonb_set(coalesce(training_bonuses,'{}'::jsonb),array[p_stat],to_jsonb(next_bonus),true),
    updated_at=now()
  where character_id=p_character_id and user_id=auth.uid();
  return public.get_shinobi_training(p_character_id);
end;
$$;
revoke all on function public.train_shinobi_stat(uuid,text,integer) from public,anon;
grant execute on function public.train_shinobi_stat(uuid,text,integer) to authenticated;

create or replace function public.train_jutsu_mastery(p_jutsu_id uuid,p_sessions integer default 1)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  j public.jutsu_techniques%rowtype;
  v public.shinobi_progression%rowtype;
  cost integer;
  next_xp integer;
  next_level integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_sessions<1 or p_sessions>5 then raise exception 'Training sessions must be between 1 and 5.'; end if;
  select * into j from public.jutsu_techniques where id=p_jutsu_id and user_id=auth.uid() for update;
  if not found then raise exception 'Jutsu not found.'; end if;
  if j.mastery_level>=5 then raise exception 'This technique is already mastered.'; end if;
  insert into public.shinobi_progression(character_id,user_id) values(j.character_id,auth.uid()) on conflict(character_id) do nothing;
  select * into v from public.shinobi_progression where character_id=j.character_id and user_id=auth.uid() for update;
  cost:=p_sessions*2;
  if v.training_points<cost then raise exception 'Not enough training points.'; end if;
  next_xp:=least(400,j.mastery_xp+(p_sessions*25));
  next_level:=least(5,1+floor(next_xp/100.0)::integer);
  update public.jutsu_techniques set mastery_xp=next_xp,mastery_level=next_level where id=j.id;
  update public.shinobi_progression set training_points=training_points-cost,updated_at=now() where character_id=j.character_id and user_id=auth.uid();
  return jsonb_build_object('mastery_xp',next_xp,'mastery_level',next_level,'training_points',v.training_points-cost);
end;
$$;
revoke all on function public.train_jutsu_mastery(uuid,integer) from public,anon;
grant execute on function public.train_jutsu_mastery(uuid,integer) to authenticated;

create or replace function public.list_shinobi_equipment(p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'user_id',user_id,'item_id',item_id,'slot',slot,'equipped',equipped,'acquired_at',acquired_at) order by acquired_at desc) from public.shinobi_equipment where character_id=p_character_id and user_id=auth.uid()),'[]'::jsonb);
end;
$$;
revoke all on function public.list_shinobi_equipment(uuid) from public,anon;
grant execute on function public.list_shinobi_equipment(uuid) to authenticated;

create or replace function public.purchase_shinobi_equipment(p_character_id uuid,p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_price integer;
  v_slot text;
  v_progress public.shinobi_progression%rowtype;
  v_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then raise exception 'Character not found.'; end if;
  select price,slot into v_price,v_slot from (values
    ('chakra-blade',350,'weapon'),('weighted-wraps',220,'armor'),('reinforced-vest',400,'armor'),('sealing-scroll',280,'tool'),
    ('smoke-kit',120,'tool'),('wire-launcher',180,'tool'),('sensor-band',260,'accessory'),('medical-pouch',240,'accessory')
  ) as catalog(item_id,price,slot) where item_id=p_item_id;
  if v_price is null then raise exception 'Unknown equipment item.'; end if;
  insert into public.shinobi_progression(character_id,user_id) values(p_character_id,auth.uid()) on conflict(character_id) do nothing;
  select * into v_progress from public.shinobi_progression where character_id=p_character_id and user_id=auth.uid() for update;
  if v_progress.ryo<v_price then raise exception 'Not enough ryō.'; end if;
  if exists(select 1 from public.shinobi_equipment where character_id=p_character_id and item_id=p_item_id) then raise exception 'Equipment already owned.'; end if;
  update public.shinobi_progression set ryo=ryo-v_price,updated_at=now() where character_id=p_character_id and user_id=auth.uid();
  insert into public.shinobi_equipment(character_id,user_id,item_id,slot) values(p_character_id,auth.uid(),p_item_id,v_slot) returning id into v_id;
  return jsonb_build_object('id',v_id,'ryo',v_progress.ryo-v_price);
end;
$$;
revoke all on function public.purchase_shinobi_equipment(uuid,text) from public,anon;
grant execute on function public.purchase_shinobi_equipment(uuid,text) to authenticated;

create or replace function public.equip_shinobi_equipment(p_character_id uuid,p_inventory_id uuid,p_equipped boolean default true)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare e public.shinobi_equipment%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select * into e from public.shinobi_equipment where id=p_inventory_id and character_id=p_character_id and user_id=auth.uid() for update;
  if not found then raise exception 'Equipment not found.'; end if;
  if p_equipped then update public.shinobi_equipment set equipped=false,updated_at=now() where character_id=p_character_id and user_id=auth.uid() and slot=e.slot and id<>e.id and equipped=true; end if;
  update public.shinobi_equipment set equipped=p_equipped,updated_at=now() where id=e.id;
  return jsonb_build_object('id',e.id,'equipped',p_equipped,'slot',e.slot);
end;
$$;
revoke all on function public.equip_shinobi_equipment(uuid,uuid,boolean) from public,anon;
grant execute on function public.equip_shinobi_equipment(uuid,uuid,boolean) to authenticated;

-- Phase 2 mission rewards now fund training and equipment progression in addition
-- to the existing XP/reputation career loop. All rewards remain rank-authoritative.
create or replace function public.complete_shinobi_mission_v10(p_mission_id uuid,p_outcome text,p_success boolean)
returns setof public.shinobi_progression
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.shinobi_missions%rowtype;
  reward_xp integer; reward_rep integer; reward_tp integer; reward_ryo integer;
  applied_xp integer; new_xp bigint; new_rep integer; new_level integer; new_title text;
begin
  select * into m from public.shinobi_missions where id=p_mission_id and user_id=auth.uid() and status='accepted' for update;
  if not found then raise exception 'Mission is not available for completion.'; end if;
  reward_xp:=case m.rank when 'D' then 80 when 'C' then 150 when 'B' then 300 when 'A' then 550 when 'S' then 900 else 0 end;
  reward_rep:=case m.rank when 'D' then 8 when 'C' then 14 when 'B' then 24 when 'A' then 40 when 'S' then 65 else 0 end;
  reward_tp:=case m.rank when 'D' then 2 when 'C' then 3 when 'B' then 5 when 'A' then 8 when 'S' then 12 else 0 end;
  reward_ryo:=case m.rank when 'D' then 60 when 'C' then 120 when 'B' then 240 when 'A' then 450 when 'S' then 800 else 0 end;
  applied_xp:=case when p_success then reward_xp else greatest(10,floor(reward_xp*0.25)::integer) end;
  insert into public.shinobi_progression(character_id,user_id) values(m.character_id,m.user_id) on conflict(character_id) do nothing;
  select xp+applied_xp,village_reputation+case when p_success then reward_rep else 0 end into new_xp,new_rep from public.shinobi_progression where character_id=m.character_id and user_id=m.user_id for update;
  new_level:=greatest(1,floor(sqrt(new_xp::numeric/70.0))::integer+1);
  new_title:=case when new_rep>=900 then 'Village Legend' when new_rep>=600 then 'Village Pillar' when new_rep>=350 then 'Trusted Elite' when new_rep>=180 then 'Trusted Operative' when new_rep>=75 then 'Proven Shinobi' when new_rep>=25 then 'Reliable Genin' else 'New Operative' end;
  update public.shinobi_progression set
    xp=new_xp,level=new_level,village_reputation=new_rep,
    training_points=training_points+case when p_success then reward_tp else 1 end,
    ryo=ryo+case when p_success then reward_ryo else 0 end,
    completed_missions=completed_missions+case when p_success then 1 else 0 end,
    d_missions=d_missions+case when p_success and m.rank='D' then 1 else 0 end,
    c_missions=c_missions+case when p_success and m.rank='C' then 1 else 0 end,
    b_missions=b_missions+case when p_success and m.rank='B' then 1 else 0 end,
    a_missions=a_missions+case when p_success and m.rank='A' then 1 else 0 end,
    s_missions=s_missions+case when p_success and m.rank='S' then 1 else 0 end,
    current_title=new_title,updated_at=now()
  where character_id=m.character_id and user_id=m.user_id;
  update public.shinobi_missions set status=case when p_success then 'completed' else 'failed' end,outcome=left(coalesce(p_outcome,''),2000),completed_at=now() where id=m.id;
  return query select * from public.shinobi_progression where character_id=m.character_id and user_id=m.user_id;
end;
$$;
revoke all on function public.complete_shinobi_mission_v10(uuid,text,boolean) from public;
grant execute on function public.complete_shinobi_mission_v10(uuid,text,boolean) to authenticated;

-- ============================================================================
-- V11 Phase 3 — Chūnin Exams & Competitive Seasons
-- ============================================================================
create table if not exists public.shinobi_competitive_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  theme text not null default '',
  status text not null default 'upcoming' check (status in ('upcoming','active','completed')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.shinobi_competitive_seasons enable row level security;
drop policy if exists "competitive seasons are public" on public.shinobi_competitive_seasons;
create policy "competitive seasons are public" on public.shinobi_competitive_seasons for select using (true);

insert into public.shinobi_competitive_seasons(slug,name,theme,status,starts_at,ends_at)
select 'rising-storm-1','Season 1 — Rising Storm','Prove your readiness through the Chūnin Exams and establish an early place in the Shinobi World.','active',now()-interval '1 day',now()+interval '90 days'
where not exists(select 1 from public.shinobi_competitive_seasons where status='active');

create table if not exists public.chunin_exam_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  season_id uuid not null references public.shinobi_competitive_seasons(id) on delete cascade,
  stage text not null default 'tactical' check (stage in ('tactical','survival','preliminaries','finals','complete')),
  status text not null default 'registered' check (status in ('registered','active','eliminated','completed')),
  tactical_score integer check (tactical_score between 0 and 100),
  survival_score integer check (survival_score between 0 and 100),
  preliminary_score integer check (preliminary_score between 0 and 100),
  final_score integer check (final_score between 0 and 100),
  total_score integer not null default 0 check (total_score >= 0),
  qualification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,season_id)
);
create index if not exists chunin_exam_entries_season_score_idx on public.chunin_exam_entries(season_id,total_score desc,updated_at asc);
create index if not exists chunin_exam_entries_user_idx on public.chunin_exam_entries(user_id,created_at desc);
alter table public.chunin_exam_entries enable row level security;
drop policy if exists "Users view own exam entries" on public.chunin_exam_entries;
create policy "Users view own exam entries" on public.chunin_exam_entries for select using (auth.uid()=user_id);
revoke insert,update,delete on public.chunin_exam_entries from anon,authenticated;

create table if not exists public.shinobi_competitive_records (
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  season_id uuid not null references public.shinobi_competitive_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  season_points integer not null default 0 check (season_points >= 0),
  exams_entered integer not null default 0 check (exams_entered >= 0),
  exams_completed integer not null default 0 check (exams_completed >= 0),
  exam_wins integer not null default 0 check (exam_wins >= 0),
  best_finish text not null default 'Unranked',
  updated_at timestamptz not null default now(),
  primary key(character_id,season_id)
);
create index if not exists shinobi_competitive_records_points_idx on public.shinobi_competitive_records(season_points desc,exam_wins desc,updated_at asc);
alter table public.shinobi_competitive_records enable row level security;
drop policy if exists "Users view own competitive record" on public.shinobi_competitive_records;
create policy "Users view own competitive record" on public.shinobi_competitive_records for select using (auth.uid()=user_id);
revoke insert,update,delete on public.shinobi_competitive_records from anon,authenticated;

create or replace function public._exam_stage_score(p_character_id uuid,p_stage text,p_season_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
stable
as $$
declare
  p public.shinobi_progression%rowtype;
  training_total integer:=0;
  mastered integer:=0;
  mission_depth integer:=0;
  variance integer:=0;
  score integer:=0;
begin
  select * into p from public.shinobi_progression where character_id=p_character_id;
  if not found then return 0; end if;
  select coalesce(sum(value::integer),0) into training_total from jsonb_each_text(coalesce(p.training_bonuses,'{}'::jsonb));
  select count(*)::integer into mastered from public.jutsu_techniques where character_id=p_character_id and mastery_level>=3;
  mission_depth:=coalesce(p.d_missions,0)+coalesce(p.c_missions,0)*2+coalesce(p.b_missions,0)*3+coalesce(p.a_missions,0)*4+coalesce(p.s_missions,0)*5;
  variance:=abs(hashtext(p_character_id::text||':'||p_stage||':'||p_season_id::text))%17;
  score:=least(100,
    18 + least(28,p.level*2) + least(18,p.village_reputation/30) + least(16,mission_depth) + least(12,training_total/2) + least(8,mastered*2) + variance
  );
  if p_stage='tactical' then score:=least(100,score + least(7,coalesce((p.training_bonuses->>'intelligence')::integer,0)+coalesce((p.training_bonuses->>'leadership')::integer,0))/2); end if;
  if p_stage='survival' then score:=least(100,score + least(7,coalesce((p.training_bonuses->>'stamina')::integer,0)+coalesce((p.training_bonuses->>'adaptability')::integer,0))/2); end if;
  if p_stage='preliminaries' then score:=least(100,score + least(7,coalesce((p.training_bonuses->>'speed')::integer,0)+coalesce((p.training_bonuses->>'taijutsu')::integer,0))/2); end if;
  if p_stage='finals' then score:=least(100,score + least(7,coalesce((p.training_bonuses->>'ninjutsu')::integer,0)+coalesce((p.training_bonuses->>'chakraControl')::integer,0))/2); end if;
  return greatest(0,score);
end;
$$;
revoke all on function public._exam_stage_score(uuid,text,uuid) from public,anon,authenticated;

create or replace function public.register_chunin_exam(p_character_id uuid)
returns public.chunin_exam_entries
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_season public.shinobi_competitive_seasons%rowtype;
  v_progress public.shinobi_progression%rowtype;
  v_entry public.chunin_exam_entries%rowtype;
  v_existing boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'Character not found.'; end if;
  select * into v_season from public.shinobi_competitive_seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  if not found then raise exception 'No active competitive season.'; end if;
  select * into v_progress from public.shinobi_progression where character_id=p_character_id and user_id=v_user;
  if not found or v_progress.level<5 or v_progress.completed_missions<3 then raise exception 'Chūnin Exam registration requires level 5 and at least 3 completed missions.'; end if;
  select exists(select 1 from public.chunin_exam_entries where character_id=p_character_id and season_id=v_season.id) into v_existing;
  insert into public.chunin_exam_entries(user_id,character_id,season_id,stage,status)
  values(v_user,p_character_id,v_season.id,'tactical','registered')
  on conflict(character_id,season_id) do update set updated_at=now()
  returning * into v_entry;
  insert into public.shinobi_competitive_records(character_id,season_id,user_id,exams_entered,updated_at)
  values(p_character_id,v_season.id,v_user,1,now())
  on conflict(character_id,season_id) do update set exams_entered=public.shinobi_competitive_records.exams_entered+case when v_existing then 0 else 1 end,updated_at=now();
  return v_entry;
end;
$$;
revoke all on function public.register_chunin_exam(uuid) from public,anon;
grant execute on function public.register_chunin_exam(uuid) to authenticated;

create or replace function public.advance_chunin_exam(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e public.chunin_exam_entries%rowtype;
  stage_score integer;
  threshold integer;
  passed boolean;
  points integer:=0;
  next_stage text;
  v_qualification text:=null;
  message text;
begin
  select * into e from public.chunin_exam_entries where id=p_entry_id and user_id=auth.uid() for update;
  if not found then raise exception 'Exam entry not found.'; end if;
  if e.status in ('eliminated','completed') then raise exception 'This exam run has already ended.'; end if;
  stage_score:=public._exam_stage_score(e.character_id,e.stage,e.season_id);
  threshold:=case e.stage when 'tactical' then 58 when 'survival' then 62 when 'preliminaries' then 66 when 'finals' then 70 else 101 end;
  passed:=stage_score>=threshold;
  points:=case e.stage when 'tactical' then case when passed then 25 else 8 end when 'survival' then case when passed then 40 else 12 end when 'preliminaries' then case when passed then 60 else 18 end when 'finals' then case when passed then 100 else 30 end else 0 end;
  next_stage:=case e.stage when 'tactical' then 'survival' when 'survival' then 'preliminaries' when 'preliminaries' then 'finals' else 'complete' end;
  if e.stage='finals' then
    v_qualification:=case when stage_score>=88 then 'Chūnin Exam Champion' when passed then 'Chūnin Certified' else 'Finalist' end;
  elsif not passed then v_qualification:=case e.stage when 'tactical' then 'Tactical Stage' when 'survival' then 'Survival Stage' else 'Preliminary Finalist' end;
  end if;
  update public.chunin_exam_entries set
    status=case when e.stage='finals' then 'completed' when passed then 'active' else 'eliminated' end,
    stage=case when e.stage='finals' or not passed then 'complete' else next_stage end,
    tactical_score=case when e.stage='tactical' then stage_score else tactical_score end,
    survival_score=case when e.stage='survival' then stage_score else survival_score end,
    preliminary_score=case when e.stage='preliminaries' then stage_score else preliminary_score end,
    final_score=case when e.stage='finals' then stage_score else final_score end,
    total_score=total_score+stage_score,
    qualification=coalesce(v_qualification,public.chunin_exam_entries.qualification),
    updated_at=now()
  where id=e.id returning * into e;
  insert into public.shinobi_competitive_records(character_id,season_id,user_id,season_points,exams_entered,updated_at)
  values(e.character_id,e.season_id,e.user_id,points,1,now())
  on conflict(character_id,season_id) do update set
    season_points=public.shinobi_competitive_records.season_points+points,
    exams_completed=public.shinobi_competitive_records.exams_completed+case when e.status in ('completed','eliminated') then 1 else 0 end,
    exam_wins=public.shinobi_competitive_records.exam_wins+case when e.qualification='Chūnin Exam Champion' then 1 else 0 end,
    best_finish=case
      when e.qualification='Chūnin Exam Champion' then 'Chūnin Exam Champion'
      when e.qualification='Chūnin Certified' and public.shinobi_competitive_records.best_finish<>'Chūnin Exam Champion' then 'Chūnin Certified'
      when e.qualification='Finalist' and public.shinobi_competitive_records.best_finish in ('Unranked','Tactical Stage','Survival Stage','Preliminary Finalist') then 'Finalist'
      when e.qualification is not null and public.shinobi_competitive_records.best_finish='Unranked' then e.qualification
      else public.shinobi_competitive_records.best_finish end,
    updated_at=now();
  if e.qualification='Chūnin Exam Champion' then
    update public.shinobi_progression set current_title='Chūnin Exam Champion',training_points=training_points+5,ryo=ryo+500,updated_at=now() where character_id=e.character_id and user_id=e.user_id;
  elsif e.qualification='Chūnin Certified' then
    update public.shinobi_progression set current_title='Chūnin Certified',training_points=training_points+3,ryo=ryo+300,updated_at=now() where character_id=e.character_id and user_id=e.user_id;
  end if;
  message:=case when passed then 'Stage passed.' else 'Stage score fell below the promotion threshold.' end;
  return jsonb_build_object('entry',to_jsonb(e),'score',stage_score,'passed',passed,'message',message,'season_points_awarded',points);
end;
$$;
revoke all on function public.advance_chunin_exam(uuid) from public,anon;
grant execute on function public.advance_chunin_exam(uuid) to authenticated;

create or replace function public.get_shinobi_competitive_record(p_character_id uuid)
returns public.shinobi_competitive_records
language plpgsql
security definer
set search_path=public
stable
as $$
declare v_row public.shinobi_competitive_records%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then return null; end if;
  select r.* into v_row from public.shinobi_competitive_records r join public.shinobi_competitive_seasons s on s.id=r.season_id where r.character_id=p_character_id and r.user_id=auth.uid() and s.status='active' order by s.starts_at desc limit 1;
  return v_row;
end;
$$;
revoke all on function public.get_shinobi_competitive_record(uuid) from public,anon;
grant execute on function public.get_shinobi_competitive_record(uuid) to authenticated;

create or replace function public.list_competitive_leaderboard(p_limit integer default 25)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'character_id',r.character_id,'name',coalesce(c.shinobi_alias,c.name),'public_slug',c.public_slug,'portrait_url',c.portrait_url,
    'village',coalesce(vm.village_id,c.village),'season_points',r.season_points,'exams_completed',r.exams_completed,'exam_wins',r.exam_wins,'best_finish',r.best_finish
  ) order by r.season_points desc,r.exam_wins desc,r.updated_at asc),'[]'::jsonb)
  from (
    select r.* from public.shinobi_competitive_records r
    join public.shinobi_competitive_seasons s on s.id=r.season_id and s.status='active'
    join public.shinobi_characters pc on pc.id=r.character_id and pc.is_public=true
    order by r.season_points desc,r.exam_wins desc,r.updated_at asc limit least(50,greatest(1,p_limit))
  ) r
  join public.shinobi_characters c on c.id=r.character_id
  left join public.village_memberships vm on vm.character_id=c.id;
$$;
revoke all on function public.list_competitive_leaderboard(integer) from public;
grant execute on function public.list_competitive_leaderboard(integer) to anon,authenticated;

-- ============================================================================
-- Release metadata — V11.2.0+
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
values('schema_version','11.2.0',now())
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

-- ============================================================================
-- V11 Phase 4 — Dynamic World Events & Rogue Shinobi
-- ============================================================================
create table if not exists public.shinobi_world_events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  event_type text not null check (event_type in ('invasion','rogue_hunt','disaster','scroll_theft','border_conflict','summoning_outbreak')),
  description text not null default '',
  target_village text null check (target_village is null or target_village in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure')),
  difficulty text not null default 'B' check (difficulty in ('D','C','B','A','S')),
  status text not null default 'active' check (status in ('upcoming','active','resolved')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.shinobi_world_events enable row level security;
drop policy if exists "world events are public" on public.shinobi_world_events;
create policy "world events are public" on public.shinobi_world_events for select using (true);

create table if not exists public.shinobi_world_event_participation (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.shinobi_world_events(id) on delete cascade,
  character_id uuid not null references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  allegiance text not null check (allegiance in ('village','rogue','independent')),
  score integer not null default 0 check (score between 0 and 100),
  success boolean not null default false,
  contribution integer not null default 0 check (contribution >= 0),
  reward jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(event_id,character_id)
);
alter table public.shinobi_world_event_participation enable row level security;
drop policy if exists "owners read event participation" on public.shinobi_world_event_participation;
create policy "owners read event participation" on public.shinobi_world_event_participation for select using (auth.uid()=user_id);
revoke insert,update,delete on public.shinobi_world_event_participation from anon,authenticated;

create table if not exists public.rogue_shinobi_profiles (
  character_id uuid primary key references public.shinobi_characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rogue_since timestamptz not null default now(),
  notoriety integer not null default 0 check (notoriety >= 0),
  bounty integer not null default 0 check (bounty >= 0),
  threat_class text not null default 'C' check (threat_class in ('D','C','B','A','S')),
  rogue_title text not null default 'Missing-nin',
  last_known_village text null,
  updated_at timestamptz not null default now()
);
alter table public.rogue_shinobi_profiles enable row level security;
drop policy if exists "owners read rogue profiles" on public.rogue_shinobi_profiles;
create policy "owners read rogue profiles" on public.rogue_shinobi_profiles for select using (auth.uid()=user_id);
revoke insert,update,delete on public.rogue_shinobi_profiles from anon,authenticated;

create index if not exists world_events_active_idx on public.shinobi_world_events(status,starts_at,ends_at);
create index if not exists world_event_participation_event_idx on public.shinobi_world_event_participation(event_id,contribution desc);
create index if not exists rogue_shinobi_bingo_idx on public.rogue_shinobi_profiles(threat_class desc,bounty desc,notoriety desc);

insert into public.shinobi_world_events(slug,title,event_type,description,target_village,difficulty,status,starts_at,ends_at)
select 'crimson-eclipse-1','Crimson Eclipse','rogue_hunt','A coordinated missing-nin network has begun moving forbidden intelligence across village borders. Village shinobi are ordered to intercept couriers while rogue operatives can exploit the chaos for notoriety.','Konohagakure','A','active',now()-interval '1 day',now()+interval '30 days'
where not exists(select 1 from public.shinobi_world_events where status='active' and ends_at>now());

create or replace function public.list_active_world_events()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'slug',e.slug,'title',e.title,'event_type',e.event_type,'description',e.description,
    'target_village',e.target_village,'difficulty',e.difficulty,'status',e.status,'starts_at',e.starts_at,'ends_at',e.ends_at,
    'participants',(select count(*) from public.shinobi_world_event_participation p where p.event_id=e.id),
    'total_contribution',(select coalesce(sum(p.contribution),0) from public.shinobi_world_event_participation p where p.event_id=e.id)
  ) order by e.starts_at desc),'[]'::jsonb)
  from public.shinobi_world_events e
  where e.status='active' and e.starts_at<=now() and e.ends_at>now();
$$;
revoke all on function public.list_active_world_events() from public;
grant execute on function public.list_active_world_events() to anon,authenticated;

create or replace function public.become_rogue(p_character_id uuid)
returns public.rogue_shinobi_profiles
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_progress public.shinobi_progression%rowtype;
  v_village text;
  v_row public.rogue_shinobi_profiles%rowtype;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'Character not found.'; end if;
  select * into v_progress from public.shinobi_progression where character_id=p_character_id and user_id=v_user;
  if not found or v_progress.level<8 or v_progress.completed_missions<5 then raise exception 'Rogue status requires level 8 and at least 5 completed missions.'; end if;
  select village_id into v_village from public.village_memberships where character_id=p_character_id and user_id=v_user;
  delete from public.village_memberships where character_id=p_character_id and user_id=v_user;
  insert into public.rogue_shinobi_profiles(character_id,user_id,notoriety,bounty,threat_class,rogue_title,last_known_village,updated_at)
  values(p_character_id,v_user,greatest(10,v_progress.level*3),greatest(500,v_progress.level*250),
    case when v_progress.level>=35 then 'S' when v_progress.level>=25 then 'A' when v_progress.level>=16 then 'B' else 'C' end,
    'Missing-nin',v_village,now())
  on conflict(character_id) do update set updated_at=now()
  returning * into v_row;
  update public.shinobi_progression set current_title='Missing-nin',updated_at=now() where character_id=p_character_id and user_id=v_user;
  return v_row;
end;
$$;
revoke all on function public.become_rogue(uuid) from public,anon;
grant execute on function public.become_rogue(uuid) to authenticated;

create or replace function public.renounce_rogue_status(p_character_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'Character not found.'; end if;
  delete from public.rogue_shinobi_profiles where character_id=p_character_id and user_id=v_user;
  update public.shinobi_progression set current_title='Independent Shinobi',updated_at=now() where character_id=p_character_id and user_id=v_user;
  return true;
end;
$$;
revoke all on function public.renounce_rogue_status(uuid) from public,anon;
grant execute on function public.renounce_rogue_status(uuid) to authenticated;

create or replace function public.get_shinobi_rogue_profile(p_character_id uuid)
returns public.rogue_shinobi_profiles
language plpgsql
security definer
set search_path=public
stable
as $$
declare v_row public.rogue_shinobi_profiles%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=auth.uid()) then return null; end if;
  select * into v_row from public.rogue_shinobi_profiles where character_id=p_character_id and user_id=auth.uid();
  return v_row;
end;
$$;
revoke all on function public.get_shinobi_rogue_profile(uuid) from public,anon;
grant execute on function public.get_shinobi_rogue_profile(uuid) to authenticated;

create or replace function public.list_public_bingo_book(p_limit integer default 30)
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'character_id',r.character_id,'name',coalesce(c.shinobi_alias,c.name),'public_slug',c.public_slug,'portrait_url',c.portrait_url,
    'clan',c.clan,'chakra_primary',c.chakra_primary,'rank',c.rank,'threat_class',r.threat_class,'bounty',r.bounty,
    'notoriety',r.notoriety,'rogue_title',r.rogue_title,'last_known_village',r.last_known_village,'rogue_since',r.rogue_since
  ) order by r.bounty desc,r.notoriety desc),'[]'::jsonb)
  from (
    select rp.* from public.rogue_shinobi_profiles rp
    join public.shinobi_characters pc on pc.id=rp.character_id and pc.is_public=true and pc.public_slug is not null
    order by rp.bounty desc,rp.notoriety desc limit least(50,greatest(1,p_limit))
  ) r join public.shinobi_characters c on c.id=r.character_id;
$$;
revoke all on function public.list_public_bingo_book(integer) from public;
grant execute on function public.list_public_bingo_book(integer) to anon,authenticated;

create or replace function public.participate_world_event(p_event_id uuid,p_character_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  e public.shinobi_world_events%rowtype;
  p public.shinobi_progression%rowtype;
  rogue public.rogue_shinobi_profiles%rowtype;
  is_rogue boolean:=false;
  has_village boolean:=false;
  v_score integer;
  v_threshold integer;
  v_success boolean;
  v_contribution integer;
  v_tp integer;
  v_ryo integer;
  v_rep integer;
  v_allegiance text;
  v_row public.shinobi_world_event_participation%rowtype;
  v_seed integer;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'Character not found.'; end if;
  if exists(select 1 from public.shinobi_world_event_participation where event_id=p_event_id and character_id=p_character_id) then raise exception 'This shinobi has already participated in this event.'; end if;
  select * into e from public.shinobi_world_events where id=p_event_id and status='active' and starts_at<=now() and ends_at>now();
  if not found then raise exception 'World event is not active.'; end if;
  select * into p from public.shinobi_progression where character_id=p_character_id and user_id=v_user;
  if not found or p.level<3 then raise exception 'World events require level 3.'; end if;
  select * into rogue from public.rogue_shinobi_profiles where character_id=p_character_id and user_id=v_user;
  is_rogue:=found;
  select exists(select 1 from public.village_memberships where character_id=p_character_id and user_id=v_user) into has_village;
  v_allegiance:=case when is_rogue then 'rogue' when has_village then 'village' else 'independent' end;
  v_seed:=abs(hashtext(p_event_id::text||p_character_id::text))%21;
  v_score:=least(100, greatest(1, 28+p.level+(p.completed_missions*2)+least(20,(coalesce((select sum(value::int) from jsonb_each_text(coalesce(p.training_bonuses,'{}'::jsonb))),0)))+v_seed));
  v_threshold:=case e.difficulty when 'D' then 35 when 'C' then 45 when 'B' then 55 when 'A' then 65 else 75 end;
  v_success:=v_score>=v_threshold;
  v_contribution:=case when v_success then greatest(10,v_score-v_threshold+25) else greatest(3,v_score/10) end;
  v_tp:=case e.difficulty when 'D' then 1 when 'C' then 2 when 'B' then 3 when 'A' then 5 else 8 end;
  v_ryo:=case e.difficulty when 'D' then 80 when 'C' then 160 when 'B' then 300 when 'A' then 550 else 900 end;
  v_rep:=case e.difficulty when 'D' then 5 when 'C' then 10 when 'B' then 18 when 'A' then 30 else 50 end;
  if not v_success then v_tp:=1; v_ryo:=v_ryo/3; v_rep:=v_rep/3; end if;

  insert into public.shinobi_world_event_participation(event_id,character_id,user_id,allegiance,score,success,contribution,reward)
  values(e.id,p_character_id,v_user,v_allegiance,v_score,v_success,v_contribution,
    jsonb_build_object('training_points',v_tp,'ryo',v_ryo,'reputation',case when is_rogue then 0 else v_rep end,'notoriety',case when is_rogue then v_rep else 0 end))
  returning * into v_row;

  update public.shinobi_progression set training_points=training_points+v_tp,ryo=ryo+v_ryo,
    village_reputation=village_reputation+case when is_rogue then 0 else v_rep end,updated_at=now()
  where character_id=p_character_id and user_id=v_user;
  if is_rogue then
    update public.rogue_shinobi_profiles set notoriety=notoriety+v_rep,bounty=bounty+(v_rep*75),
      threat_class=case when notoriety+v_rep>=180 then 'S' when notoriety+v_rep>=110 then 'A' when notoriety+v_rep>=60 then 'B' when notoriety+v_rep>=25 then 'C' else 'D' end,
      updated_at=now() where character_id=p_character_id and user_id=v_user;
  end if;
  return jsonb_build_object('participation',to_jsonb(v_row),'score',v_score,'success',v_success,'contribution',v_contribution,
    'message',case when v_success then 'World-event objective completed.' else 'The operation fell short, but field experience was gained.' end);
end;
$$;
revoke all on function public.participate_world_event(uuid,uuid) from public,anon;
grant execute on function public.participate_world_event(uuid,uuid) to authenticated;

create or replace function public.list_my_world_event_participation(p_character_id uuid)
returns setof public.shinobi_world_event_participation
language sql
security definer
set search_path=public
stable
as $$
  select p.* from public.shinobi_world_event_participation p
  join public.shinobi_characters c on c.id=p.character_id
  where p.character_id=p_character_id and c.user_id=auth.uid()
  order by p.created_at desc limit 30;
$$;
revoke all on function public.list_my_world_event_participation(uuid) from public,anon;
grant execute on function public.list_my_world_event_participation(uuid) to authenticated;

-- Rejoin village clears rogue status so allegiance remains singular.
create or replace function public.join_village(p_character_id uuid,p_village_id text)
returns public.village_memberships
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_row public.village_memberships%rowtype;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if p_village_id not in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure') then raise exception 'Unknown village.'; end if;
  if not exists(select 1 from public.shinobi_characters where id=p_character_id and user_id=v_user) then raise exception 'Character not found.'; end if;
  delete from public.rogue_shinobi_profiles where character_id=p_character_id and user_id=v_user;
  insert into public.village_memberships(character_id,user_id,village_id,joined_at,updated_at)
  values(p_character_id,v_user,p_village_id,now(),now())
  on conflict(character_id) do update set village_id=excluded.village_id,user_id=excluded.user_id,updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.join_village(uuid,text) from public,anon;
grant execute on function public.join_village(uuid,text) to authenticated;

-- ============================================================================
-- V11 Phase 5 — Cooperative Team Operations & Village Wars
-- ============================================================================

create table if not exists public.shinobi_team_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.shinobi_teams(id) on delete cascade,
  rank text not null check (rank in ('D','C','B','A','S')),
  title text not null,
  objective text not null,
  score integer not null default 0,
  success boolean not null default false,
  contribution integer not null default 0,
  rewards jsonb not null default '{}'::jsonb,
  operation_day date not null default current_date,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);
create index if not exists shinobi_team_operations_team_idx on public.shinobi_team_operations(team_id,created_at desc);
create unique index if not exists shinobi_team_operations_daily_rank_idx on public.shinobi_team_operations(team_id,rank,operation_day);
create index if not exists shinobi_team_operations_user_idx on public.shinobi_team_operations(user_id,created_at desc);
alter table public.shinobi_team_operations enable row level security;
drop policy if exists "Users can view own team operations" on public.shinobi_team_operations;
create policy "Users can view own team operations" on public.shinobi_team_operations for select using(auth.uid()=user_id);
revoke insert,update,delete on public.shinobi_team_operations from anon,authenticated;


create or replace function public.list_team_operations(p_team_id uuid)
returns setof public.shinobi_team_operations
language sql
security definer
set search_path=public
stable
as $$
  select o.* from public.shinobi_team_operations o
  join public.shinobi_teams t on t.id=o.team_id
  where o.team_id=p_team_id and t.user_id=auth.uid()
  order by o.created_at desc limit 30;
$$;
revoke all on function public.list_team_operations(uuid) from public,anon;
grant execute on function public.list_team_operations(uuid) to authenticated;

create or replace function public.deploy_team_operation(p_team_id uuid,p_rank text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_team public.shinobi_teams%rowtype;
  v_member_count integer;
  v_owned_count integer;
  v_avg_level numeric;
  v_avg_missions numeric;
  v_training integer;
  v_score integer;
  v_threshold integer;
  v_success boolean;
  v_xp integer;
  v_rep integer;
  v_tp integer;
  v_ryo integer;
  v_contribution integer;
  v_title text;
  v_objective text;
  v_row public.shinobi_team_operations%rowtype;
  r record;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if p_rank not in ('D','C','B','A','S') then raise exception 'Unknown operation rank.'; end if;
  select * into v_team from public.shinobi_teams where id=p_team_id and user_id=v_user;
  if not found then raise exception 'Squad not found.'; end if;

  select count(*) into v_member_count from public.shinobi_team_members where team_id=p_team_id;
  if v_member_count<2 then raise exception 'Cooperative operations require at least two squad members.'; end if;
  if exists(select 1 from public.shinobi_team_operations where team_id=p_team_id and rank=p_rank and operation_day=current_date) then raise exception 'This squad has already completed its '||p_rank||'-Rank operation for today.'; end if;

  select count(*),coalesce(avg(coalesce(p.level,1)),1),coalesce(avg(coalesce(p.completed_missions,0)),0),
         coalesce(sum((select coalesce(sum(value::int),0) from jsonb_each_text(coalesce(p.training_bonuses,'{}'::jsonb)))),0)
  into v_owned_count,v_avg_level,v_avg_missions,v_training
  from public.shinobi_team_members tm
  join public.shinobi_characters c on c.id=tm.character_id
  left join public.shinobi_progression p on p.character_id=c.id
  where tm.team_id=p_team_id and c.user_id=v_user;
  if v_owned_count<1 then raise exception 'At least one squad member must belong to your archive.'; end if;

  if p_rank='C' and v_avg_level<4 then raise exception 'C-Rank operations require an average owned-shinobi level of 4.'; end if;
  if p_rank='B' and v_avg_level<8 then raise exception 'B-Rank operations require an average owned-shinobi level of 8.'; end if;
  if p_rank='A' and v_avg_level<14 then raise exception 'A-Rank operations require an average owned-shinobi level of 14.'; end if;
  if p_rank='S' and v_avg_level<22 then raise exception 'S-Rank operations require an average owned-shinobi level of 22.'; end if;

  v_score:=least(120,greatest(1,round(v_avg_level*4+v_avg_missions*1.5+least(30,v_training/2.0)+v_member_count*8+(abs(hashtext(p_team_id::text||p_rank||current_date::text))%21))::integer));
  v_threshold:=case p_rank when 'D' then 35 when 'C' then 50 when 'B' then 65 when 'A' then 80 else 95 end;
  v_success:=v_score>=v_threshold;
  v_xp:=case p_rank when 'D' then 100 when 'C' then 180 when 'B' then 340 when 'A' then 600 else 1000 end;
  v_rep:=case p_rank when 'D' then 10 when 'C' then 18 when 'B' then 28 when 'A' then 45 else 70 end;
  v_tp:=case p_rank when 'D' then 2 when 'C' then 3 when 'B' then 5 when 'A' then 8 else 12 end;
  v_ryo:=case p_rank when 'D' then 90 when 'C' then 180 when 'B' then 320 when 'A' then 600 else 1000 end;
  if not v_success then v_xp:=greatest(20,v_xp/4);v_rep:=0;v_tp:=1;v_ryo:=greatest(30,v_ryo/3);end if;
  v_contribution:=case when v_success then greatest(15,v_score-v_threshold+20) else greatest(4,v_score/12) end;
  v_title:=case p_rank when 'D' then 'Supply Line Sweep' when 'C' then 'Border Escort' when 'B' then 'Hostile Cell Interdiction' when 'A' then 'Deep Territory Extraction' else 'Strategic Threat Suppression' end;
  v_objective:=case p_rank when 'D' then 'Coordinate the squad to secure a contested logistics route.' when 'C' then 'Protect a high-value convoy through unstable territory.' when 'B' then 'Locate and neutralize a coordinated hostile shinobi cell.' when 'A' then 'Extract an intelligence asset from defended enemy territory.' else 'Defeat a strategic threat that requires full-squad synchronization.' end;

  for r in select c.id from public.shinobi_team_members tm join public.shinobi_characters c on c.id=tm.character_id where tm.team_id=p_team_id and c.user_id=v_user loop
    insert into public.shinobi_progression(character_id,user_id) values(r.id,v_user) on conflict(character_id) do nothing;
    update public.shinobi_progression set
      xp=xp+v_xp,
      level=greatest(1,floor(sqrt((xp+v_xp)::numeric/70.0))::integer+1),
      village_reputation=village_reputation+v_rep,
      training_points=training_points+v_tp,
      ryo=ryo+v_ryo,
      updated_at=now()
    where character_id=r.id and user_id=v_user;
  end loop;

  insert into public.shinobi_team_operations(user_id,team_id,rank,title,objective,score,success,contribution,rewards)
  values(v_user,p_team_id,p_rank,v_title,v_objective,v_score,v_success,v_contribution,
    jsonb_build_object('xp',v_xp,'reputation',v_rep,'training_points',v_tp,'ryo',v_ryo))
  returning * into v_row;
  return jsonb_build_object('operation',to_jsonb(v_row),'team_score',v_score,'success',v_success,
    'rewarded_characters',v_owned_count,'message',case when v_success then 'Squad operation completed successfully.' else 'The squad withdrew after a difficult operation, but gained field experience.' end);
end;
$$;
revoke all on function public.deploy_team_operation(uuid,text) from public,anon;
grant execute on function public.deploy_team_operation(uuid,text) to authenticated;

create table if not exists public.village_war_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'upcoming' check(status in ('upcoming','active','completed')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check(ends_at>starts_at)
);

create table if not exists public.village_war_deployments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.village_war_seasons(id) on delete cascade,
  team_id uuid not null references public.shinobi_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  village_id text not null check(village_id in ('Konohagakure','Sunagakure','Kumogakure','Iwagakure','Kirigakure')),
  score integer not null default 0,
  success boolean not null default false,
  war_points integer not null default 0 check(war_points>=0),
  deployment_day date not null default current_date,
  created_at timestamptz not null default now(),
  unique(season_id,team_id,deployment_day)
);
create index if not exists village_war_deployments_season_idx on public.village_war_deployments(season_id,village_id,war_points desc);
create index if not exists village_war_deployments_user_idx on public.village_war_deployments(user_id,created_at desc);
alter table public.village_war_seasons enable row level security;
alter table public.village_war_deployments enable row level security;
drop policy if exists "Public can view village war seasons" on public.village_war_seasons;
create policy "Public can view village war seasons" on public.village_war_seasons for select using(true);
drop policy if exists "Users can view own village war deployments" on public.village_war_deployments;
create policy "Users can view own village war deployments" on public.village_war_deployments for select using(auth.uid()=user_id);
revoke insert,update,delete on public.village_war_seasons from anon,authenticated;
revoke insert,update,delete on public.village_war_deployments from anon,authenticated;

insert into public.village_war_seasons(slug,name,status,starts_at,ends_at)
values('five-kage-front','Five Kage Front','active',now()-interval '1 day',now()+interval '90 days')
on conflict(slug) do nothing;

create or replace function public.get_active_village_war()
returns public.village_war_seasons
language sql
security definer
set search_path=public
stable
as $$
  select * from public.village_war_seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
$$;
revoke all on function public.get_active_village_war() from public;
grant execute on function public.get_active_village_war() to anon,authenticated;

create or replace function public.list_village_war_standings()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  with active as (select id from public.village_war_seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1),
  villages(village_id) as (values ('Konohagakure'),('Sunagakure'),('Kumogakure'),('Iwagakure'),('Kirigakure')),
  totals as (
    select v.village_id,coalesce(sum(d.war_points),0)::int war_points,
      count(*) filter(where d.success)::int victories,count(d.id)::int deployments
    from villages v left join active a on true left join public.village_war_deployments d on d.season_id=a.id and d.village_id=v.village_id
    group by v.village_id
  ), ranked as (select *,dense_rank() over(order by war_points desc,victories desc,village_id)::int as rank from totals)
  select coalesce(jsonb_agg(to_jsonb(ranked) order by rank,village_id),'[]'::jsonb) from ranked;
$$;
revoke all on function public.list_village_war_standings() from public;
grant execute on function public.list_village_war_standings() to anon,authenticated;

create or replace function public.list_my_village_war_deployments(p_team_id uuid default null)
returns setof public.village_war_deployments
language sql
security definer
set search_path=public
stable
as $$
  select d.* from public.village_war_deployments d
  where d.user_id=auth.uid() and (p_team_id is null or d.team_id=p_team_id)
  order by d.created_at desc limit 40;
$$;
revoke all on function public.list_my_village_war_deployments(uuid) from public,anon;
grant execute on function public.list_my_village_war_deployments(uuid) to authenticated;

create or replace function public.deploy_village_war_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_season public.village_war_seasons%rowtype;
  v_village text;
  v_owned integer;
  v_village_count integer;
  v_avg_level numeric;
  v_missions numeric;
  v_training integer;
  v_score integer;
  v_success boolean;
  v_points integer;
  v_row public.village_war_deployments%rowtype;
  r record;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if not exists(select 1 from public.shinobi_teams where id=p_team_id and user_id=v_user) then raise exception 'Squad not found.'; end if;
  select * into v_season from public.village_war_seasons where status='active' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  if not found then raise exception 'No village war is active.'; end if;
  if exists(select 1 from public.village_war_deployments where season_id=v_season.id and team_id=p_team_id and deployment_day=current_date) then raise exception 'This squad has already deployed to the village war today.'; end if;

  select count(*),count(distinct vm.village_id),min(vm.village_id),coalesce(avg(p.level),1),coalesce(avg(p.completed_missions),0),
    coalesce(sum((select coalesce(sum(value::int),0) from jsonb_each_text(coalesce(p.training_bonuses,'{}'::jsonb)))),0)
  into v_owned,v_village_count,v_village,v_avg_level,v_missions,v_training
  from public.shinobi_team_members tm
  join public.shinobi_characters c on c.id=tm.character_id and c.user_id=v_user
  join public.village_memberships vm on vm.character_id=c.id and vm.user_id=v_user
  left join public.shinobi_progression p on p.character_id=c.id
  where tm.team_id=p_team_id;
  if v_owned<2 then raise exception 'Village war deployment requires at least two of your own village shinobi in the squad.'; end if;
  if v_village_count<>1 then raise exception 'All deployed owned shinobi must serve the same village.'; end if;

  v_score:=least(130,greatest(1,round(v_avg_level*4+v_missions*1.5+least(35,v_training/2.0)+v_owned*10+(abs(hashtext(v_season.id::text||p_team_id::text||current_date::text))%26))::integer));
  v_success:=v_score>=72;
  v_points:=case when v_success then greatest(25,v_score-35) else greatest(8,v_score/8) end;

  insert into public.village_war_deployments(season_id,team_id,user_id,village_id,score,success,war_points)
  values(v_season.id,p_team_id,v_user,v_village,v_score,v_success,v_points)
  returning * into v_row;

  for r in select c.id from public.shinobi_team_members tm join public.shinobi_characters c on c.id=tm.character_id and c.user_id=v_user join public.village_memberships vm on vm.character_id=c.id and vm.user_id=v_user and vm.village_id=v_village where tm.team_id=p_team_id loop
    update public.shinobi_progression set training_points=training_points+case when v_success then 3 else 1 end,
      ryo=ryo+case when v_success then 300 else 100 end,
      village_reputation=village_reputation+case when v_success then 20 else 5 end,
      updated_at=now() where character_id=r.id and user_id=v_user;
  end loop;

  return jsonb_build_object('deployment',to_jsonb(v_row),'score',v_score,'success',v_success,'war_points',v_points,
    'message',case when v_success then v_village||' secured a successful war deployment.' else v_village||' was pushed back, but the squad preserved field intelligence.' end);
end;
$$;
revoke all on function public.deploy_village_war_team(uuid) from public,anon;
grant execute on function public.deploy_village_war_team(uuid) to authenticated;

-- ============================================================================
-- Release metadata — V11.4.0+
-- ============================================================================
insert into public.app_release_metadata(key,value,updated_at)
values('schema_version','11.4.0',now())
on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
