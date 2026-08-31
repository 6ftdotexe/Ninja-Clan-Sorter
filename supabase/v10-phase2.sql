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

  reward_xp := coalesce((m.rewards->>'xp')::integer, 0);
  reward_rep := coalesce((m.rewards->>'reputation')::integer, 0);
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
