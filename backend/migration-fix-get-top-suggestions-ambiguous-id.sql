-- ============================================================
-- Fix: ambiguous column reference "id" in get_top_suggestions()
-- ============================================================
-- get_top_suggestions() (added in migration-blind-poll.sql) declares
-- RETURNS TABLE (id uuid, ...) — in PL/pgSQL, RETURNS TABLE columns
-- become implicit variables visible through the whole function body,
-- just like OUT parameters. The line
--
--   select current_contest_id into v_contest_id from shops where id = p_shop_id;
--
-- has an unqualified "id", which Postgres can't resolve between
-- shops.id and the function's own output variable "id" — it raises
-- 42702 "column reference \"id\" is ambiguous" on every call, for
-- every shop, regardless of whether it has suggestions. This is what
-- was breaking ShopDetailScreen's load() on the customer side (it
-- calls this RPC via Promise.all alongside the shop fetch, so this
-- error was aborting the whole screen with "Couldn't load this
-- business" even though the shop query itself was fine).
--
-- Fix: qualify the column as shops.id. No other changes.

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
  select current_contest_id into v_contest_id from shops where shops.id = p_shop_id;

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
