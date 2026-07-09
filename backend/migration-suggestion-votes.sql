-- CoffeeConnect OS — Migration: suggestion voting
-- Run after migration-suggestions.sql.

create table if not exists suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references deal_suggestions(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (suggestion_id, customer_id) -- one vote per customer per suggestion
);

create index if not exists suggestion_votes_suggestion_id_idx on suggestion_votes (suggestion_id);
create index if not exists suggestion_votes_customer_id_idx on suggestion_votes (customer_id);

alter table suggestion_votes enable row level security;

create policy "Customers can view own votes"
on suggestion_votes
for select
using (customer_id = auth.uid());

create policy "Customers can add own vote"
on suggestion_votes
for insert
with check (customer_id = auth.uid());

create policy "Customers can remove own vote"
on suggestion_votes
for delete
using (customer_id = auth.uid());

-- Lets the owner dashboard show vote counts per suggestion (via Supabase's
-- embedded count syntax, which still respects this policy).
create policy "Shop owners can view votes for own shop's suggestions"
on suggestion_votes
for select
using (
  exists (
    select 1 from deal_suggestions
    join shops on shops.id = deal_suggestions.shop_id
    where deal_suggestions.id = suggestion_votes.suggestion_id
    and shops.owner_id = auth.uid()
  )
);

-- ============================================================
-- get_top_suggestions() — powers the customer "top requested deals" view
-- ============================================================
-- SECURITY DEFINER on purpose: this returns aggregate vote counts and
-- suggestion text across ALL customers' suggestions for a shop, which
-- is intentionally public-facing (that's the point of the feature) —
-- but it does NOT expose who submitted each one. Base table RLS still
-- restricts direct row-level access to deal_suggestions to the
-- submitter and the shop owner; this function is the one sanctioned
-- way to see shop-wide aggregates without loosening that.
create or replace function get_top_suggestions(p_shop_id uuid, p_limit int default 3)
returns table (
  id uuid,
  suggestion text,
  vote_count bigint,
  has_voted boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_customer_id uuid := auth.uid();
begin
  return query
  select
    ds.id,
    ds.suggestion,
    count(sv.id) as vote_count,
    exists (
      select 1 from suggestion_votes v2
      where v2.suggestion_id = ds.id and v2.customer_id = v_customer_id
    ) as has_voted
  from deal_suggestions ds
  left join suggestion_votes sv on sv.suggestion_id = ds.id
  where ds.shop_id = p_shop_id
  group by ds.id
  order by vote_count desc, ds.created_at asc
  limit p_limit;
end;
$$;

grant execute on function get_top_suggestions(uuid, int) to authenticated, anon;

-- ============================================================
-- toggle_suggestion_vote() — one click to vote, click again to unvote
-- ============================================================
create or replace function toggle_suggestion_vote(p_suggestion_id uuid)
returns boolean -- true if a vote now exists, false if it was removed
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_existing uuid;
begin
  if v_customer_id is null then
    raise exception 'Sign in to vote on a suggestion';
  end if;

  select id into v_existing
    from suggestion_votes
    where suggestion_id = p_suggestion_id and customer_id = v_customer_id;

  if v_existing is not null then
    delete from suggestion_votes where id = v_existing;
    return false;
  else
    insert into suggestion_votes (suggestion_id, customer_id)
    values (p_suggestion_id, v_customer_id);
    return true;
  end if;
end;
$$;

grant execute on function toggle_suggestion_vote(uuid) to authenticated;
