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
