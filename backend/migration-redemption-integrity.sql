-- LocalPulse — Migration: redemption integrity constraint
-- Run any time; safe on an empty or low-volume redemptions table.
--
-- Defense-in-depth for the redeem-offer double-scan race. The Edge
-- Function (backend/supabase/functions/redeem-offer/index.ts) now checks
-- that its UPDATE actually matched a row before inserting a redemption —
-- but application-level checks can regress in a future edit. This adds
-- the same guarantee at the database layer: it becomes structurally
-- impossible for the same claimed_offer_id to be redeemed twice, no
-- matter what the application code does.
--
-- IMPORTANT — run this check first:
--   select claimed_offer_id, count(*)
--   from redemptions
--   group by claimed_offer_id
--   having count(*) > 1;
--
-- If that returns any rows, you already have duplicate redemptions from
-- before the Edge Function fix. Deduplicate those rows manually (decide
-- which of each duplicate pair to keep) before running the ALTER below —
-- otherwise it will fail with a uniqueness violation.

alter table redemptions
  add constraint redemptions_claimed_offer_id_unique unique (claimed_offer_id);
