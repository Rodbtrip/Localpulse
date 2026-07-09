-- CoffeeConnect OS — Row Level Security Policies (corrected)
-- Run after schema.sql and rpc-functions.sql (uses is_admin() from that file).

alter table profiles enable row level security;
alter table shops enable row level security;
alter table promotions enable row level security;
alter table claimed_offers enable row level security;
alter table redemptions enable row level security;
alter table favorites enable row level security;
alter table subscriptions enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "Users can read own profile"
on profiles
for select
using (id = auth.uid());

create policy "Users can update own profile"
on profiles
for update
using (id = auth.uid());

create policy "Admins can view all profiles"
on profiles
for select
using (is_admin());

-- ============================================================
-- SHOPS
-- ============================================================
create policy "Anyone can view active shops"
on shops
for select
using (is_active = true);

-- Added: owners were previously unable to see their OWN shop in the
-- dashboard before an admin approved it (is_active = false), since the
-- only select policy required is_active = true.
create policy "Owners can view own shop regardless of status"
on shops
for select
using (owner_id = auth.uid());

create policy "Owners can create shops"
on shops
for insert
with check (owner_id = auth.uid());

create policy "Owners can update own shops"
on shops
for update
using (owner_id = auth.uid());

create policy "Admins can view all shops"
on shops
for select
using (is_admin());

-- Added: required for the admin "approve or disable shops" screen.
create policy "Admins can update any shop"
on shops
for update
using (is_admin());

-- ============================================================
-- PROMOTIONS
-- ============================================================
create policy "Anyone can view active promotions"
on promotions
for select
using (
  is_active = true
  and start_time <= now()
  and end_time >= now()
);

-- Added: owners need to see their own draft/expired/inactive promotions
-- in their dashboard, not just the ones currently live to the public.
create policy "Owners can view own promotions regardless of status"
on promotions
for select
using (
  exists (
    select 1 from shops
    where shops.id = promotions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Owners can create promotions for own shops"
on promotions
for insert
with check (
  exists (
    select 1 from shops
    where shops.id = promotions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Owners can update promotions for own shops"
on promotions
for update
using (
  exists (
    select 1 from shops
    where shops.id = promotions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Admins can view all promotions"
on promotions
for select
using (is_admin());

-- Added: required for the admin "promotion moderation" screen.
create policy "Admins can moderate any promotion"
on promotions
for update
using (is_admin());

-- ============================================================
-- CLAIMED OFFERS
-- ============================================================
create policy "Customers can view own claimed offers"
on claimed_offers
for select
using (customer_id = auth.uid());

-- Note: inserts now go through the claim_offer() function (security
-- definer), not a direct client insert, so no client-facing insert
-- policy is defined here. The function enforces customer_id = auth.uid()
-- internally before writing.

create policy "Shop owners can view claims for own shop"
on claimed_offers
for select
using (
  exists (
    select 1 from shops
    where shops.id = claimed_offers.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Admins can view all claimed offers"
on claimed_offers
for select
using (is_admin());

-- Note: redemption (status update to 'redeemed') is handled exclusively
-- by the redeem-offer Edge Function using the service role key, which
-- performs an explicit shop-ownership check before writing. No
-- client-facing update policy is defined here on purpose — this closes
-- the gap where any authenticated owner could previously redeem any
-- shop's codes via a direct table update.

-- ============================================================
-- REDEMPTIONS (previously had RLS enabled but zero policies —
-- meaning default-deny and a broken analytics/billing page)
-- ============================================================
create policy "Shop owners can view own redemptions"
on redemptions
for select
using (
  exists (
    select 1 from shops
    where shops.id = redemptions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Customers can view own redemptions"
on redemptions
for select
using (customer_id = auth.uid());

create policy "Admins can view all redemptions"
on redemptions
for select
using (is_admin());

-- Inserts happen only via the service-role Edge Function — no
-- client-facing insert policy defined here on purpose.

-- ============================================================
-- FAVORITES (previously had RLS enabled but zero policies)
-- ============================================================
create policy "Customers can view own favorites"
on favorites
for select
using (customer_id = auth.uid());

create policy "Customers can add own favorites"
on favorites
for insert
with check (customer_id = auth.uid());

create policy "Customers can remove own favorites"
on favorites
for delete
using (customer_id = auth.uid());

-- ============================================================
-- SUBSCRIPTIONS (previously had RLS enabled but zero policies)
-- ============================================================
create policy "Shop owners can view own subscription"
on subscriptions
for select
using (
  exists (
    select 1 from shops
    where shops.id = subscriptions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Admins can view all subscriptions"
on subscriptions
for select
using (is_admin());

-- Inserts/updates happen only via the Stripe webhook handler using the
-- service role key — no client-facing insert/update policy here.
