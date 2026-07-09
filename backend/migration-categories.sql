-- CoffeeConnect OS — Migration: multi-vertical category support
-- Run this after schema.sql / rpc-functions.sql / rls-policies.sql are already applied.
-- Safe to run once; re-running will error harmlessly on the "already exists" bits if needed.

alter table shops
  add column if not exists category text
  check (category in ('coffee', 'restaurant', 'salon', 'fitness', 'retail', 'auto', 'bar', 'other'))
  default 'coffee';

create index if not exists shops_category_idx on shops (category);

-- ============================================================
-- nearby_shops() — powers the customer "browse offers near me" screen
-- ============================================================
-- Takes the customer's coordinates, an optional category filter, and a
-- search radius, and returns active shops within range sorted by
-- distance, along with a count of their currently-active promotions.
-- Uses the PostGIS geography column + GiST index added in schema.sql,
-- so this stays fast even with thousands of shops.
create or replace function nearby_shops(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int default 8000,
  p_category text default null
)
returns table (
  id uuid,
  name text,
  description text,
  category text,
  address text,
  city text,
  state text,
  logo_url text,
  distance_meters double precision,
  active_promotion_count bigint
)
language sql
stable
as $$
  select
    shops.id,
    shops.name,
    shops.description,
    shops.category,
    shops.address,
    shops.city,
    shops.state,
    shops.logo_url,
    ST_Distance(
      shops.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters,
    (
      select count(*) from promotions
      where promotions.shop_id = shops.id
        and promotions.is_active = true
        and promotions.start_time <= now()
        and promotions.end_time >= now()
    ) as active_promotion_count
  from shops
  where shops.is_active = true
    and shops.location is not null
    and ST_DWithin(
      shops.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    and (p_category is null or shops.category = p_category)
  order by distance_meters asc;
$$;

grant execute on function nearby_shops(double precision, double precision, int, text) to authenticated, anon;
