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
