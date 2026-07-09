-- LocalPulse — Migration: blind poll, one vote per contest, no undo
-- Run after migration-wider-categories.sql.
--
-- Reworks the voting mechanic in three ways:
-- 1. ONE VOTE PER CONTEST — previously a customer could vote for
--    multiple of the 3 featured suggestions in the same round (the
--    unique constraint was per-suggestion, not per-contest-round).
--    Adds a `current_contest_id` per shop that changes every time a
--    round resolves, and scopes the uniqueness to that round.
-- 2. CANNOT BE UNDONE — the old toggle_suggestion_vote() let a
--    customer un-vote. Replaced with cast_vote(), which is insert-only:
--    once cast, it's locked in for that contest round.
-- 3. HIDDEN RESULTS, NO RANKING — get_top_suggestions() no longer
--    returns vote counts, and the order returned is no longer sorted
--    by votes (previously highest-voted first, which passively leaked
--    standings through display position). Customers now see the 3
--    featured suggestions as a blind poll — no numbers, no ranking —
--    until the contest resolves and the winner is revealed as a real,
--    live promotion.

-- ============================================================
-- 1. Contest round tracking
-- ============================================================
alter table shops
  add column if not exists current_contest_id uuid not null default gen_random_uuid();

alter table suggestion_votes
  add column if not exists contest_id uuid;

-- Backfill: assign one contest_id per shop to any pre-existing votes
-- (best-effort, since the round concept didn't exist before this
-- migration — fine for a system not yet carrying real vote history).
update suggestion_votes sv
set contest_id = s.current_contest_id
from deal_suggestions ds
join shops s on s.id = ds.shop_id
where sv.suggestion_id = ds.id and sv.contest_id is null;

alter table suggestion_votes alter column contest_id set not null;

-- Replace the old per-suggestion uniqueness with per-contest-round
alter table suggestion_votes drop constraint if exists suggestion_votes_suggestion_id_customer_id_key;
alter table suggestion_votes add constraint suggestion_votes_contest_customer_unique unique (contest_id, customer_id);

-- ============================================================
-- 2. cast_vote() — replaces toggle_suggestion_vote(). Insert-only:
-- once cast, a vote cannot be changed or removed for that contest round.
-- ============================================================
drop function if exists toggle_suggestion_vote(uuid);

create or replace function cast_vote(p_suggestion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_shop_id uuid;
  v_contest_id uuid;
begin
  if v_customer_id is null then
    raise exception 'Sign in to vote on a suggestion';
  end if;

  select ds.shop_id, s.current_contest_id into v_shop_id, v_contest_id
  from deal_suggestions ds
  join shops s on s.id = ds.shop_id
  where ds.id = p_suggestion_id and ds.featured = true;

  if v_shop_id is null then
    raise exception 'This suggestion is not currently open for voting';
  end if;

  if exists (
    select 1 from suggestion_votes
    where contest_id = v_contest_id and customer_id = v_customer_id
  ) then
    raise exception 'You already voted in this contest — votes cannot be changed';
  end if;

  insert into suggestion_votes (suggestion_id, customer_id, contest_id)
  values (p_suggestion_id, v_customer_id, v_contest_id);
end;
$$;

grant execute on function cast_vote(uuid) to authenticated;

-- ============================================================
-- 3. get_top_suggestions() — no vote counts, no vote-based ordering.
-- Returns whether THIS customer already voted in the CURRENT contest
-- (true on the one they picked, false on the other two, or false on
-- all three if they haven't voted yet) — enough for the UI to lock
-- the poll after voting, without revealing standings.
-- Must be dropped first since the return columns are changing shape
-- (Postgres doesn't allow CREATE OR REPLACE to alter output columns).
-- ============================================================
drop function if exists get_top_suggestions(uuid, int);

create or replace function get_top_suggestions(p_shop_id uuid, p_limit int default 3)
returns table (
  id uuid,
  suggestion text,
  is_my_vote boolean,
  already_voted_this_contest boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_customer_id uuid := auth.uid();
  v_contest_id uuid;
  v_already_voted boolean;
begin
  select current_contest_id into v_contest_id from shops where id = p_shop_id;

  select exists (
    select 1 from suggestion_votes
    where contest_id = v_contest_id and customer_id = v_customer_id
  ) into v_already_voted;

  return query
  select
    ds.id,
    ds.suggestion,
    exists (
      select 1 from suggestion_votes sv
      where sv.suggestion_id = ds.id and sv.customer_id = v_customer_id
        and sv.contest_id = v_contest_id
    ) as is_my_vote,
    v_already_voted as already_voted_this_contest
  from deal_suggestions ds
  where ds.shop_id = p_shop_id
    and ds.featured = true
  order by ds.created_at asc -- NOT vote count — order must never leak standings
  limit p_limit;
end;
$$;

-- ============================================================
-- Update finalize_suggestion_win() and resolve_expired_suggestion_contests()
-- to rotate current_contest_id when a round resets, so the next round's
-- votes are scoped fresh and customers can vote again.
-- ============================================================
create or replace function resolve_expired_suggestion_contests()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop record;
  v_winner record;
begin
  for v_shop in
    select id, name, suggestion_reward
    from shops
    where suggestion_contest_ends_at is not null
      and suggestion_contest_ends_at <= now()
  loop
    select ds.id, ds.suggestion, ds.customer_id into v_winner
    from deal_suggestions ds
    left join suggestion_votes sv on sv.suggestion_id = ds.id
    where ds.shop_id = v_shop.id
      and ds.featured = true
    group by ds.id
    order by count(sv.id) desc, ds.created_at asc
    limit 1;

    if v_winner.id is not null and v_shop.suggestion_reward is not null
       and trim(v_shop.suggestion_reward) <> '' then
      perform finalize_suggestion_win(
        v_winner.id, v_shop.id, v_shop.name, v_winner.customer_id, v_shop.suggestion_reward
      );
    end if;

    update deal_suggestions set featured = false where shop_id = v_shop.id and featured = true;
    update shops
    set suggestion_contest_ends_at = null,
        current_contest_id = gen_random_uuid() -- fresh round, fresh voting eligibility
    where id = v_shop.id;
  end loop;
end;
$$;
