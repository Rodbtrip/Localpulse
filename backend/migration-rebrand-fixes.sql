-- LocalPulse — Migration: remove coffee-only default category
-- Run after migration-market-explore.sql.
--
-- The original category column (added in migration-categories.sql,
-- back when this was CoffeeConnect) defaulted new shops to 'coffee'.
-- Now that the platform is multi-vertical from the start, new shops
-- should not silently default into a category — the owner should pick
-- one explicitly during shop setup.

alter table shops alter column category drop default;

-- Existing rows that were already defaulted to 'coffee' are left as-is
-- intentionally — this only changes behavior for newly created shops.
-- If you want to review which existing shops were auto-defaulted vs.
-- deliberately chosen 'coffee', there's no way to distinguish them
-- retroactively, since the default was applied silently at insert time.
