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
