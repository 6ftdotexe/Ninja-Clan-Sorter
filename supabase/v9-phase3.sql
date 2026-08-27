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
grant execute on function public.grant_generation_credits(uuid,integer) to service_role;
grant execute on function public.reserve_generation_credits(uuid,integer) to service_role;

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
