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
  "kycStatus" text default 'pending',
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
```

## 3) Disable RLS for quick start (development)

For fast setup only:

```sql
alter table eso_users disable row level security;
alter table eso_admin_wallets disable row level security;
alter table eso_deposits disable row level security;
alter table eso_withdrawals disable row level security;
alter table eso_trades disable row level security;
```

For production, enable RLS and add proper policies.

## 4) Redeploy to Netlify

Upload/deploy the project after setting keys.

## 5) Test

1. Create user on phone.
2. Open admin on Mac and refresh.
3. User should appear in Admin -> All Users.
4. Add wallet in Admin -> Wallet Addresses.
5. Open Deposit on phone; wallet should show.
