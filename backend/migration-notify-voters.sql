-- LocalPulse — Migration: notify voters on a suggestion win
-- Run after migration-referral-billing.sql.
--
-- Two things:
-- 1. Extracts win-resolution logic (award prize, publish promotion,
--    notify people) into one shared function, since it was previously
--    duplicated between the manual "Implemented" path and the
--    automatic deadline-based path — and only the automatic path
--    actually published a promotion. Both paths now behave identically.
-- 2. Adds notifications for everyone who VOTED for the winning
--    suggestion (not just the customer who submitted it, and not the
--    general public) — they get told the promotion they helped choose
--    is now live.

-- ============================================================
-- finalize_suggestion_win() — the single source of truth for what
-- happens when a suggestion wins, called by both award_suggestion_prize()
-- and resolve_expired_suggestion_contests() below.
-- ============================================================
create or replace function finalize_suggestion_win(
  p_suggestion_id uuid,
  p_shop_id uuid,
  p_shop_name text,
  p_customer_id uuid,
  p_reward text
)
returns boolean -- true if newly finalized, false if already finalized (idempotent)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempts int := 0;
  v_suggestion_text text;
  v_voter record;
begin
  if exists (select 1 from suggestion_prizes where suggestion_id = p_suggestion_id) then
    return false;
  end if;

  select suggestion into v_suggestion_text from deal_suggestions where id = p_suggestion_id;

  loop
    v_attempts := v_attempts + 1;
    v_code := 'SP-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into suggestion_prizes (shop_id, customer_id, suggestion_id, prize_description, code)
      values (p_shop_id, p_customer_id, p_suggestion_id, p_reward, v_code);
      exit;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'Could not generate a unique prize code, please try again';
      end if;
    end;
  end loop;

  update deal_suggestions set status = 'implemented' where id = p_suggestion_id;

  insert into promotions (
    shop_id, title, description, discount_type, discount_value,
    start_time, end_time, max_redemptions, is_active
  ) values (
    p_shop_id,
    left(v_suggestion_text, 100),
    'Published from the #1 customer-voted suggestion.',
    'custom', null, now(), now() + interval '7 days', null, true
  );

  -- Notify the winning submitter — this is their prize
  insert into notifications (customer_id, message)
  values (
    p_customer_id,
    'Your suggestion won at ' || p_shop_name || '! Check My Offers to redeem your prize.'
  );

  -- Notify everyone who VOTED for the winning suggestion (excluding the
  -- submitter, who already got the message above, and excluding
  -- everyone else who didn't vote for this one).
  for v_voter in
    select distinct customer_id from suggestion_votes
    where suggestion_id = p_suggestion_id and customer_id <> p_customer_id
  loop
    insert into notifications (customer_id, message)
    values (
      v_voter.customer_id,
      'The suggestion you voted for won at ' || p_shop_name || '! The promotion is live now — check it out.'
    );
  end loop;

  return true;
end;
$$;

-- ============================================================
-- award_suggestion_prize() — now delegates to finalize_suggestion_win(),
-- so the manual "Implemented" path publishes a promotion and notifies
-- voters too, matching the automatic path exactly.
-- ============================================================
create or replace function award_suggestion_prize(p_suggestion_id uuid)
returns table (awarded boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_shop_name text;
  v_customer_id uuid;
  v_reward text;
  v_is_featured boolean;
  v_top_suggestion_id uuid;
  v_finalized boolean;
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

  select name, suggestion_reward into v_shop_name, v_reward from shops where id = v_shop_id;
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

  v_finalized := finalize_suggestion_win(p_suggestion_id, v_shop_id, v_shop_name, v_customer_id, v_reward);

  if not v_finalized then
    return query select false, 'A prize was already awarded for this suggestion';
    return;
  end if;

  return query select true, 'Awarded';
end;
$$;

-- ============================================================
-- resolve_expired_suggestion_contests() — now delegates to
-- finalize_suggestion_win() too, instead of duplicating the award +
-- promotion + notification logic inline.
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
    update shops set suggestion_contest_ends_at = null where id = v_shop.id;
  end loop;
end;
$$;
