# CoffeeConnect OS — Fixes Applied

Run order: `schema.sql` → `rpc-functions.sql` → `rls-policies.sql` → deploy `supabase/functions/redeem-offer`.

## 1. Missing RLS policies (critical — was silently breaking the app)
`redemptions`, `favorites`, and `subscriptions` had `enable row level security` called with zero policies defined — in Postgres this means default-deny, so no one could read or write to those tables at all. Added full policy sets for all three in `rls-policies.sql`.

## 2. Race condition in the claim flow (critical)
The original `claimOffer()` didn't atomically check `max_redemptions` before inserting, so two simultaneous claims on the last slot could both succeed. Replaced with `claim_offer()` in `rpc-functions.sql` — a `SECURITY DEFINER` function that locks the promotion row (`FOR UPDATE`) for the duration of the check-and-insert, serializing concurrent claims.

## 3. No shop-ownership check on redemption (critical — security)
The original `redeemOffer()` let any authenticated shop owner redeem *any* shop's codes, since nothing verified the caller owned the shop the code belonged to. Replaced with a Supabase Edge Function (`supabase/functions/redeem-offer/index.ts`) that verifies the caller's identity from their JWT, then explicitly checks `shop.owner_id === caller.id` before allowing the redemption.

## 4. Unsafe, non-collision-handled code generation
`Math.random().toString(36)` client-side isn't cryptographically random and had no retry logic on collision. `claim_offer()` now generates codes with `pgcrypto`'s `gen_random_bytes` and retries up to 5 times on a `unique_violation` instead of surfacing a raw database error to the customer.

## 5. No admin RLS policies at all
The admin dashboard routes existed in the spec, but no policies granted admin-role access to anything. Added an `is_admin()` helper function and admin-scoped policies across profiles, shops, and promotions.

## 6. No geospatial indexing for "nearby shops"
`latitude`/`longitude` were plain `numeric` columns with no spatial index — correct at a handful of shops, broken (both correctness and performance) at scale. Added the PostGIS extension, a `geography(Point, 4326)` column kept in sync via trigger, and a GiST index for fast proximity queries.

## Smaller fixes
- Added `updated_at` columns + triggers on `profiles`, `shops`, `promotions`, and `subscriptions`.
- Added foreign-key indexes across all tables (`shop_id`, `customer_id`, `promotion_id`, etc.) — the original schema had none beyond primary keys, which would slow every dashboard query as data grows.
- Added a `check (end_time > start_time)` constraint on `promotions` to prevent impossible promotion windows at the database level.
- Added the missing `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` — PostHog was named as the analytics tool in the README but had no corresponding env vars.
- Added `Owners can view own shop/promotions regardless of status` policies — without these, an owner couldn't see their own shop in their dashboard before admin approval, or their own paused/expired promotions.

## Not changed, but worth knowing
`on delete cascade` is still used throughout. This is fine as long as "disable a shop" (the admin action described in the README) is implemented as setting `is_active = false`, not an actual row delete — a real delete would still destroy promotion/redemption history, which conflicts with wanting case studies and historical analytics later. No code change needed here, just a implementation note for whoever builds the admin "disable" button.
