-- LocalPulse — Enable automatic contest resolution
-- Run once. Safe to re-run (create extension if not exists, and
-- cron.schedule upserts by job name if it already exists).
--
-- After this runs, resolve_expired_suggestion_contests() (the current
-- version of that function lives in migration-notify-voters.sql) gets
-- called automatically every 10 minutes by Postgres itself — no external
-- scheduler, no cron job on your machine, nothing that depends on your
-- laptop being on.

create extension if not exists pg_cron;

select cron.schedule(
  'resolve-suggestion-contests',
  '*/10 * * * *',
  $$select resolve_expired_suggestion_contests();$$
);
