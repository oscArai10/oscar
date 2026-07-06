-- ============================================================================
-- oscAr — Supabase schema (v1: auth foundation)
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query →
-- paste → Run). Safe to re-run: everything is guarded with IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS.
--
-- Design note: RLS is on from day one, and the PULSE (public app) vs CORE
-- (owner admin) separation is STRUCTURAL — enforced by the `role` column and
-- RLS policies, not by application code. The public app's queries physically
-- cannot read another user's rows, and only an 'owner' role can see the
-- admin surface.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_tier as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user (wallet OR email).
-- id mirrors auth.users.id so RLS can use auth.uid() directly.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  wallet_address text unique,
  email          text,
  display_name   text,
  role           user_role not null default 'user',
  tier           user_tier not null default 'free',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is 'Public user profiles. role=owner unlocks oscAr CORE.';

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile whenever an auth user is created.
-- Wallet users carry wallet_address in user_metadata; email users carry email.
-- SECURITY DEFINER so the trigger can insert regardless of the caller's RLS.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, wallet_address, email, display_name)
  values (
    new.id,
    lower(nullif(new.raw_user_meta_data->>'wallet_address', '')),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      new.email,
      new.raw_user_meta_data->>'wallet_address'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Helper: is the current user an owner? SECURITY DEFINER avoids RLS recursion
-- when a policy needs to check the caller's own role.
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- A user can read their own profile; an owner (CORE) can read all.
drop policy if exists "profiles_select_own_or_owner" on public.profiles;
create policy "profiles_select_own_or_owner"
  on public.profiles for select
  using (auth.uid() = id or public.is_owner());

-- A user can update their own profile, but NOT their own role/tier
-- (those are set server-side with the service role). Enforced by re-checking
-- the columns haven't changed.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and tier = (select tier from public.profiles where id = auth.uid())
  );

-- No client-side INSERT/DELETE: profiles are created by the trigger and the
-- service role only. (No policy = denied under RLS.)

-- ---------------------------------------------------------------------------
-- Done. Later steps add: deployments, audit_reports (each with its own RLS
-- scoping rows to auth.uid()), and CORE-only tables gated behind is_owner().
-- ---------------------------------------------------------------------------
