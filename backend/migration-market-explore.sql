-- CoffeeConnect OS — Migration: owner market visibility
-- Run after migration-suggestion-votes.sql.
--
-- Lets a signed-in shop owner see other active shops' currently-running
-- promotions — title, discount, and timing — filterable by category and
-- optionally by distance. This is not a new privacy exposure: active
-- shops and active promotions are already publicly selectable per the
-- existing RLS policies ("Anyone can view active shops/promotions"),
-- since customers browsing /browse already see this same data. This
-- function just adds a distance calculation relative to the *caller's*
-- own shop and a convenient combined view, rather than granting any
-- new table access.

create or replace function get_market_promotions(
  p_shop_id uuid,
  p_category text default null,
  p_radius_meters int default null
)
returns table (
  shop_id uuid,
  shop_name text,
  category text,
  city text,
  state text,
  distance_meters double precision,
  promotion_id uuid,
  promo_title text,
  promo_description text,
  discount_type text,
  discount_value numeric,
  start_time timestamptz,
  end_time timestamptz
)
language sql
stable
as $$
  select
    s.id as shop_id,
    s.name as shop_name,
    s.category,
    s.city,
    s.state,
    case when caller.location is not null and s.location is not null
      then ST_Distance(s.location, caller.location)
      else null
    end as distance_meters,
    p.id as promotion_id,
    p.title as promo_title,
    p.description as promo_description,
    p.discount_type,
    p.discount_value,
    p.start_time,
    p.end_time
  from shops s
  join promotions p on p.shop_id = s.id
  cross join lateral (
    select location from shops where shops.id = p_shop_id
  ) as caller
  where s.is_active = true
    and s.id <> p_shop_id
    and p.is_active = true
    and p.start_time <= now()
    and p.end_time >= now()
    and (p_category is null or s.category = p_category)
    and (
      p_radius_meters is null
      or (
        caller.location is not null
        and s.location is not null
        and ST_DWithin(s.location, caller.location, p_radius_meters)
      )
    )
  order by distance_meters asc nulls last, p.end_time asc;
$$;

grant execute on function get_market_promotions(uuid, text, int) to authenticated;
