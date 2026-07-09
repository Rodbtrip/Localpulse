-- CoffeeConnect OS Database Schema (corrected)
-- Run this file first, then rpc-functions.sql, then rls-policies.sql.

create extension if not exists "pgcrypto";
create extension if not exists "postgis"; -- required for shop geolocation queries

-- Generic trigger function to keep updated_at current on every table that has it
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('customer', 'owner', 'admin')) default 'customer',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger set_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

-- ============================================================
-- SHOPS
-- ============================================================
create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  location geography(Point, 4326), -- derived from lat/long, used for nearby-shop queries
  logo_url text,
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index shops_owner_id_idx on shops (owner_id);
create index shops_location_idx on shops using gist (location); -- required for fast "nearby shops" lookups

create trigger set_shops_updated_at
before update on shops
for each row execute function set_updated_at();

-- Keeps the geography column in sync whenever lat/long is written,
-- so callers never have to construct the PostGIS point themselves.
create or replace function sync_shop_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$;

create trigger sync_shops_location
before insert or update of latitude, longitude on shops
for each row execute function sync_shop_location();

-- ============================================================
-- PROMOTIONS
-- ============================================================
create table promotions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percent', 'fixed', 'bogo', 'custom')),
  discount_value numeric,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  max_redemptions int,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint promotions_valid_window check (end_time > start_time)
);

create index promotions_shop_id_idx on promotions (shop_id);
create index promotions_active_window_idx on promotions (is_active, start_time, end_time);

create trigger set_promotions_updated_at
before update on promotions
for each row execute function set_updated_at();

-- ============================================================
-- CLAIMED OFFERS
-- ============================================================
create table claimed_offers (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references promotions(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  code text unique not null,
  status text check (status in ('claimed', 'redeemed', 'expired')) default 'claimed',
  claimed_at timestamp with time zone default now(),
  redeemed_at timestamp with time zone
);

create index claimed_offers_promotion_id_idx on claimed_offers (promotion_id);
create index claimed_offers_shop_id_idx on claimed_offers (shop_id);
create index claimed_offers_customer_id_idx on claimed_offers (customer_id);
create index claimed_offers_status_idx on claimed_offers (status);

-- ============================================================
-- REDEMPTIONS
-- ============================================================
create table redemptions (
  id uuid primary key default gen_random_uuid(),
  claimed_offer_id uuid references claimed_offers(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  amount_spent numeric,
  created_at timestamp with time zone default now()
);

create index redemptions_shop_id_idx on redemptions (shop_id);
create index redemptions_customer_id_idx on redemptions (customer_id);

-- ============================================================
-- FAVORITES
-- ============================================================
create table favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(customer_id, shop_id)
);

create index favorites_customer_id_idx on favorites (customer_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text check (plan in ('starter', 'growth', 'pro')),
  status text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index subscriptions_shop_id_idx on subscriptions (shop_id);

create trigger set_subscriptions_updated_at
before update on subscriptions
for each row execute function set_updated_at();
