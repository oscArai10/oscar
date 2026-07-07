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
  id                    uuid primary key references auth.users(id) on delete cascade,
  wallet_address        text unique,
  email                 text,
  display_name          text,
  role                  user_role not null default 'user',
  tier                  user_tier not null default 'free',
  paddle_customer_id    text unique,
  paddle_subscription_id text unique,
  subscription_status   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is 'Public user profiles. role=owner unlocks oscAr CORE.';

-- Migration for tables created before Paddle billing existed — safe to
-- re-run, no-ops if the columns are already there.
alter table public.profiles add column if not exists paddle_customer_id text;
alter table public.profiles add column if not exists paddle_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
do $$ begin
  alter table public.profiles add constraint profiles_paddle_customer_id_key unique (paddle_customer_id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_paddle_subscription_id_key unique (paddle_subscription_id);
exception when duplicate_object then null; end $$;

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

-- A user can update their own profile, but NOT their own role/tier/billing
-- fields (those are set server-side with the service role — tier and the
-- paddle_* columns only ever change via the Paddle webhook handler).
-- Enforced by re-checking the columns haven't changed.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and tier = (select tier from public.profiles where id = auth.uid())
    and paddle_customer_id is not distinct from
      (select paddle_customer_id from public.profiles where id = auth.uid())
    and paddle_subscription_id is not distinct from
      (select paddle_subscription_id from public.profiles where id = auth.uid())
    and subscription_status is not distinct from
      (select subscription_status from public.profiles where id = auth.uid())
  );

-- No client-side INSERT/DELETE: profiles are created by the trigger and the
-- service role only. (No policy = denied under RLS.)

-- ---------------------------------------------------------------------------
-- deployments — one row per token deployment (testnet or mainnet). Written
-- by the deploy flow (a later build step); the table exists now so the
-- dashboard can query real (currently empty) data rather than placeholders.
-- chain is a free-text slug matching the keys in src/lib/chains/chains.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.deployments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  contract_name    text not null,
  token_name       text not null,
  token_symbol     text not null,
  chain            text not null,
  is_mainnet       boolean not null default false,
  status           text not null default 'pending' check (status in ('pending', 'active', 'failed')),
  audit_score      integer,
  contract_address text,
  tx_hash          text,
  explorer_url     text,
  created_at       timestamptz not null default now()
);

comment on table public.deployments is 'One row per token deployment. Populated by the deploy flow (later build step).';

alter table public.deployments enable row level security;

drop policy if exists "deployments_select_own_or_owner" on public.deployments;
create policy "deployments_select_own_or_owner"
  on public.deployments for select
  using (auth.uid() = user_id or public.is_owner());

drop policy if exists "deployments_insert_own" on public.deployments;
create policy "deployments_insert_own"
  on public.deployments for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- audit_reports — one row per audit run from the Token Factory. Written by
-- POST /api/audit for signed-in users (best-effort — a failed insert never
-- breaks the audit response). deployment_id is nullable since audits happen
-- before a deploy exists.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  deployment_id       uuid references public.deployments(id) on delete set null,
  contract_name       text not null,
  token_name          text,
  token_symbol        text,
  security_score      integer not null,
  gas_score           integer not null,
  code_quality_score  integer not null,
  overall_score       integer not null,
  passes_gate         boolean not null,
  findings            jsonb not null default '[]',
  summary             text not null,
  created_at          timestamptz not null default now()
);

comment on table public.audit_reports is 'One row per Token Factory audit run (see src/lib/audit/pipeline.ts).';

alter table public.audit_reports enable row level security;

drop policy if exists "audit_reports_select_own_or_owner" on public.audit_reports;
create policy "audit_reports_select_own_or_owner"
  on public.audit_reports for select
  using (auth.uid() = user_id or public.is_owner());

drop policy if exists "audit_reports_insert_own" on public.audit_reports;
create policy "audit_reports_insert_own"
  on public.audit_reports for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Done. Later steps add CORE-only tables gated behind is_owner().
-- ---------------------------------------------------------------------------
