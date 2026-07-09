-- LocalPulse — Migration: owner-curated top 3
-- Run after migration-require-prize.sql.
--
-- Previously, "top requested deals" auto-selected the 3 highest-voted
-- suggestions out of EVERY submission, with no business input. This
-- adds a `featured` flag so the business first reviews all submissions
-- (still fully visible on their dashboard) and picks up to 3 to put up
-- for public customer voting — filtering out spam, duplicates, or
-- ideas that aren't feasible before opening it to a vote.

alter table deal_suggestions
  add column if not exists featured boolean not null default false;

-- ============================================================
-- Enforce max 3 featured per shop at the database level, not just in
-- the UI — a trigger, since a CHECK constraint can't count sibling rows.
-- ============================================================
create or replace function enforce_max_featured_suggestions()
returns trigger
language plpgsql
as $$
declare
  v_featured_count int;
begin
  if new.featured = true and (old is null or old.featured = false) then
    select count(*) into v_featured_count
    from deal_suggestions
    where shop_id = new.shop_id and featured = true;

    if v_featured_count >= 3 then
      raise exception 'This business already has 3 featured suggestions — unfeature one first';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_max_featured_suggestions_trigger
before update of featured on deal_suggestions
for each row execute function enforce_max_featured_suggestions();

-- Shop owners already have an update policy on deal_suggestions from
-- rls-policies.sql — no new policy needed, the trigger above applies
-- regardless of which policy allowed the update through.

-- ============================================================
-- get_top_suggestions() — now scoped to FEATURED suggestions only,
-- ranked by vote count. Un-featured suggestions never appear here,
-- no matter how many votes they'd hypothetically get.
-- ============================================================
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
    and ds.featured = true
  group by ds.id
  order by vote_count desc, ds.created_at asc
  limit p_limit;
end;
$$;

-- ============================================================
-- award_suggestion_prize() — the "#1 voted" check now only considers
-- featured suggestions, matching what customers actually voted among.
-- ============================================================
create or replace function award_suggestion_prize(p_suggestion_id uuid)
returns table (awarded boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_customer_id uuid;
  v_reward text;
  v_is_featured boolean;
  v_top_suggestion_id uuid;
  v_already_awarded boolean;
  v_code text;
  v_attempts int := 0;
begin
  select shop_id, customer_id, featured into v_shop_id, v_customer_id, v_is_featured
  from deal_suggestions
  where id = p_suggestion_id;

  if v_shop_id is null then
    return query select false, 'Suggestion not found';
    return;
  end if;

  if not exists (
    select 1 from shops where shops.id = v_shop_id and shops.owner_id = auth.uid()
  ) then
    raise exception 'Not authorized to award a prize for this shop''s suggestions';
  end if;

  if not v_is_featured then
    return query select false, 'This suggestion was never featured for customer voting';
    return;
  end if;

  select suggestion_reward into v_reward from shops where id = v_shop_id;
  if v_reward is null or trim(v_reward) = '' then
    return query select false, 'No reward configured for this business yet';
    return;
  end if;

  select ds.id into v_top_suggestion_id
  from deal_suggestions ds
  left join suggestion_votes sv on sv.suggestion_id = ds.id
  where ds.shop_id = v_shop_id
    and ds.featured = true
  group by ds.id
  order by count(sv.id) desc, ds.created_at asc
  limit 1;

  if v_top_suggestion_id is distinct from p_suggestion_id then
    return query select false, 'This suggestion is not (or is no longer) the #1 voted one among featured suggestions';
    return;
  end if;

  select exists (
    select 1 from suggestion_prizes where suggestion_id = p_suggestion_id
  ) into v_already_awarded;

  if v_already_awarded then
    return query select false, 'A prize was already awarded for this suggestion';
    return;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := 'SP-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into suggestion_prizes (shop_id, customer_id, suggestion_id, prize_description, code)
      values (v_shop_id, v_customer_id, p_suggestion_id, v_reward, v_code);
      exit;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'Could not generate a unique prize code, please try again';
      end if;
    end;
  end loop;

  return query select true, 'Awarded';
end;
$$;
