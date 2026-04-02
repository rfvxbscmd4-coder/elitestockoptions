# Supabase setup (cross-device sync)

## Recommended secure mode

Use [SUPABASE_SETUP_SECURE.sql](SUPABASE_SETUP_SECURE.sql) for production (Supabase Auth + RLS).
The SQL in this file is the hardened setup and should be preferred.

This project now supports Supabase for shared data across devices.

## 1) Configure keys

Edit [public/js/supabase-config.js](public/js/supabase-config.js):

- `window.ESO_SUPABASE_URL`
- `window.ESO_SUPABASE_ANON_KEY`

## 2) Create tables in Supabase SQL editor

For quick testing only, you can use the legacy SQL below.
For production, run [SUPABASE_SETUP_SECURE.sql](SUPABASE_SETUP_SECURE.sql) instead.

```sql
create table if not exists eso_users (
  id text primary key,
  "fullName" text,
  email text unique not null,
  phone text,
  "countryCode" text,
  "phoneNumber" text,
  country text,
  "referralCode" text,
  password text not null,
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
  "createdAt" timestamptz default now()
);

create table if not exists eso_admin_wallets (
  "cryptoId" text primary key,
  address text not null,
  network text
);

create table if not exists eso_deposits (
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

create table if not exists eso_withdrawals (
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

create table if not exists eso_trades (
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

create table if not exists eso_upgrades (
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

create table if not exists eso_loans (
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

create table if not exists eso_notifications (
  id text primary key,
  "userId" text not null,
  category text default 'notification',
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  "targetEmail" text,
  meta jsonb,
  "createdAt" timestamptz default now()
);
```

## 3) Disable RLS for quick start (development)

For fast setup only:

```sql
alter table eso_users disable row level security;
alter table eso_admin_wallets disable row level security;
alter table eso_deposits disable row level security;
alter table eso_withdrawals disable row level security;
alter table eso_trades disable row level security;
alter table eso_upgrades disable row level security;
alter table eso_loans disable row level security;
alter table eso_notifications disable row level security;
```

For production, enable RLS and add proper policies.
If you already ran the older secure SQL before this fix, rerun [SUPABASE_SETUP_SECURE.sql](SUPABASE_SETUP_SECURE.sql) so existing users can be matched by authenticated email, the `eso_loans` table exists, the KYC columns/default status are corrected for cross-device approval, and the `eso_notifications` table is created for admin messages and dashboard delivery.

## 4) Redeploy to Netlify

Upload/deploy the project after setting keys.

## 4.1) Configure Supabase Auth redirect URLs

In Supabase Dashboard -> Authentication -> URL Configuration:

- Set `Site URL` to your live site, for example `https://www.elitestockoptions.net`
- Add these `Redirect URLs`:
  - `https://www.elitestockoptions.net/reset-password.html`
  - `https://elitestockoptions.net/reset-password.html`

If you use a Netlify preview or temporary domain, add that reset-password URL too.

## 5) Test

1. Create user on phone.
2. Open admin on Mac and refresh.
3. User should appear in Admin -> All Users.
4. Add wallet in Admin -> Wallet Addresses.
5. Open Deposit on phone; wallet should show.
