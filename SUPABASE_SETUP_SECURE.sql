-- Secure Supabase schema + RLS for ELITESTOCKOPTIONS
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.eso_users (
  id text primary key,
  auth_id uuid unique,
  "fullName" text,
  email text unique not null,
  phone text,
  "countryCode" text,
  "phoneNumber" text,
  country text,
  "referralCode" text,
  password text,
  plan text default 'Bronze',
  balance numeric default 0,
  "availableCash" numeric default 0,
  "profitsBalance" numeric default 0,
  "kycStatus" text default 'not_submitted',
  "kycSubmittedAt" timestamptz,
  "kycVerifiedAt" timestamptz,
  "kycData" jsonb,
  "kycDocuments" jsonb,
  "updatedAt" timestamptz default now(),
  "createdAt" timestamptz default now(),
  "isAdmin" boolean default false
);

alter table public.eso_users add column if not exists "kycSubmittedAt" timestamptz;
alter table public.eso_users add column if not exists "kycVerifiedAt" timestamptz;
alter table public.eso_users add column if not exists "kycData" jsonb;
alter table public.eso_users add column if not exists "kycDocuments" jsonb;
alter table public.eso_users add column if not exists "updatedAt" timestamptz default now();
alter table public.eso_users alter column "kycStatus" set default 'not_submitted';

update public.eso_users
set "kycStatus" = 'not_submitted'
where coalesce("kycStatus", '') in ('', 'pending')
  and "kycSubmittedAt" is null
  and "kycData" is null
  and "kycDocuments" is null;

create table if not exists public.eso_admin_wallets (
  "cryptoId" text primary key,
  address text not null,
  network text
);

create table if not exists public.eso_deposits (
  id text primary key,
  "userId" text not null,
  "cryptoId" text,
  "cryptoName" text,
  "cryptoSymbol" text,
  amount numeric not null,
  "txHash" text,
  status text default 'pending',
  "createdAt" timestamptz default now(),
  "approvedAt" timestamptz
);

create table if not exists public.eso_withdrawals (
  id text primary key,
  "userId" text not null,
  source text,
  method text,
  "cryptoType" text,
  address text,
  amount numeric not null,
  fee numeric,
  "netAmount" numeric,
  status text default 'pending',
  "createdAt" timestamptz default now(),
  "approvedAt" timestamptz
);

create table if not exists public.eso_trades (
  id text primary key,
  "userId" text not null,
  symbol text not null,
  type text,
  "orderType" text,
  amount numeric not null,
  leverage integer default 1,
  "entryPrice" numeric,
  "currentPrice" numeric,
  "exitPrice" numeric,
  "tpPrice" numeric,
  "slPrice" numeric,
  status text default 'open',
  pnl numeric default 0,
  "pnlPercent" numeric default 0,
  "openedAt" timestamptz default now(),
  "closedAt" timestamptz
);

create table if not exists public.eso_upgrades (
  id text primary key,
  "userId" text not null,
  "fromPlan" text,
  "toPlan" text not null,
  "requiredDeposit" numeric not null,
  status text default 'pending',
  "createdAt" timestamptz default now(),
  "approvedAt" timestamptz,
  "rejectedAt" timestamptz
);

create table if not exists public.eso_loans (
  id text primary key,
  "userId" text not null,
  amount numeric not null,
  period integer not null,
  purpose text,
  status text default 'pending',
  "createdAt" timestamptz default now(),
  "approvedAt" timestamptz,
  "rejectedAt" timestamptz
);

-- Helper function for admin checks
create or replace function public.eso_is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.eso_users u
    where u.auth_id = uid and coalesce(u."isAdmin", false) = true
  );
$$;

create or replace function public.eso_matches_auth_email(target_email text)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and lower(coalesce(target_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

alter table public.eso_users enable row level security;
alter table public.eso_admin_wallets enable row level security;
alter table public.eso_deposits enable row level security;
alter table public.eso_withdrawals enable row level security;
alter table public.eso_trades enable row level security;
alter table public.eso_upgrades enable row level security;
alter table public.eso_loans enable row level security;

-- USERS policies
drop policy if exists "users_select_self_or_admin" on public.eso_users;
create policy "users_select_self_or_admin"
on public.eso_users for select
using (
  auth.uid() = auth_id
  or public.eso_matches_auth_email(email)
  or public.eso_is_admin(auth.uid())
);

drop policy if exists "users_insert_self_or_admin" on public.eso_users;
create policy "users_insert_self_or_admin"
on public.eso_users for insert
with check (
  auth.uid() = auth_id
  or public.eso_matches_auth_email(email)
  or public.eso_is_admin(auth.uid())
);

drop policy if exists "users_update_self_or_admin" on public.eso_users;
create policy "users_update_self_or_admin"
on public.eso_users for update
using (
  auth.uid() = auth_id
  or public.eso_matches_auth_email(email)
  or public.eso_is_admin(auth.uid())
)
with check (
  auth.uid() = auth_id
  or public.eso_matches_auth_email(email)
  or public.eso_is_admin(auth.uid())
);

-- WALLET policies
drop policy if exists "wallets_select_authenticated" on public.eso_admin_wallets;
create policy "wallets_select_authenticated"
on public.eso_admin_wallets for select
using (auth.uid() is not null);

drop policy if exists "wallets_modify_admin_only" on public.eso_admin_wallets;
create policy "wallets_modify_admin_only"
on public.eso_admin_wallets for all
using (public.eso_is_admin(auth.uid()))
with check (public.eso_is_admin(auth.uid()));

-- DEPOSIT policies
drop policy if exists "deposits_select_own_or_admin" on public.eso_deposits;
create policy "deposits_select_own_or_admin"
on public.eso_deposits for select
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "deposits_insert_own_or_admin" on public.eso_deposits;
create policy "deposits_insert_own_or_admin"
on public.eso_deposits for insert
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "deposits_update_admin_only" on public.eso_deposits;
create policy "deposits_update_admin_only"
on public.eso_deposits for update
using (public.eso_is_admin(auth.uid()))
with check (public.eso_is_admin(auth.uid()));

-- WITHDRAWAL policies
drop policy if exists "withdrawals_select_own_or_admin" on public.eso_withdrawals;
create policy "withdrawals_select_own_or_admin"
on public.eso_withdrawals for select
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "withdrawals_insert_own_or_admin" on public.eso_withdrawals;
create policy "withdrawals_insert_own_or_admin"
on public.eso_withdrawals for insert
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "withdrawals_update_admin_only" on public.eso_withdrawals;
create policy "withdrawals_update_admin_only"
on public.eso_withdrawals for update
using (public.eso_is_admin(auth.uid()))
with check (public.eso_is_admin(auth.uid()));

-- TRADES policies
drop policy if exists "trades_select_own_or_admin" on public.eso_trades;
create policy "trades_select_own_or_admin"
on public.eso_trades for select
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "trades_insert_own_or_admin" on public.eso_trades;
create policy "trades_insert_own_or_admin"
on public.eso_trades for insert
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "trades_update_own_or_admin" on public.eso_trades;
create policy "trades_update_own_or_admin"
on public.eso_trades for update
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
)
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

-- UPGRADE policies
drop policy if exists "upgrades_select_own_or_admin" on public.eso_upgrades;
create policy "upgrades_select_own_or_admin"
on public.eso_upgrades for select
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "upgrades_insert_own_or_admin" on public.eso_upgrades;
create policy "upgrades_insert_own_or_admin"
on public.eso_upgrades for insert
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "upgrades_update_admin_only" on public.eso_upgrades;
create policy "upgrades_update_admin_only"
on public.eso_upgrades for update
using (public.eso_is_admin(auth.uid()))
with check (public.eso_is_admin(auth.uid()));

-- LOAN policies
drop policy if exists "loans_select_own_or_admin" on public.eso_loans;
create policy "loans_select_own_or_admin"
on public.eso_loans for select
using (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "loans_insert_own_or_admin" on public.eso_loans;
create policy "loans_insert_own_or_admin"
on public.eso_loans for insert
with check (
  public.eso_is_admin(auth.uid())
  or exists (
    select 1 from public.eso_users u
    where u.id = "userId" and u.auth_id = auth.uid()
  )
);

drop policy if exists "loans_update_admin_only" on public.eso_loans;
create policy "loans_update_admin_only"
on public.eso_loans for update
using (public.eso_is_admin(auth.uid()))
with check (public.eso_is_admin(auth.uid()));

-- Create initial admin user profile after signing up via Supabase Auth
-- Replace YOUR_ADMIN_AUTH_UUID with auth.users.id for your admin account:
-- update public.eso_users set "isAdmin" = true where auth_id = 'YOUR_ADMIN_AUTH_UUID';
