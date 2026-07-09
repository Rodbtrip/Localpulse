-- LocalPulse — Migration: automatic-only resolution
-- Run after migration-notify-voters.sql.
--
-- Three changes:
-- 1. Removes the manual "Implemented" resolution path entirely —
--    award_suggestion_prize() is dropped. Contests now ONLY resolve
--    automatically when suggestion_contest_ends_at passes.
-- 2. Since a deadline is now the only way a contest ever resolves, a
--    business can no longer feature suggestions without one set —
--    otherwise votes would accumulate forever with no resolution.
--    Enforced by the same trigger that already caps featured at 3.
-- 3. Adds a notification to the BUSINESS OWNER when their contest
--    resolves, alongside the existing submitter + voter notifications.
--    Recap of who gets notified, and only these three: the business
--    owner, the winning submitter, and everyone who voted for the
--    winning suggestion. Customers who voted for a suggestion that
--    did NOT win get no notification, but still have the same open
--    access to the resulting promotion as anyone else browsing —
--    nothing about the promotion itself is restricted to voters.

-- ============================================================
-- 1. Drop the manual path
-- ============================================================
drop function if exists award_suggestion_prize(uuid);

-- ============================================================
-- 2. Require a contest deadline before a business can feature anything
-- ============================================================
create or replace function enforce_max_featured_suggestions()
returns trigger
language plpgsql
as $$
declare
  v_featured_count int;
  v_has_deadline boolean;
begin
  if new.featured = true and (old is null or old.featured = false) then
    select (suggestion_contest_ends_at is not null) into v_has_deadline
    from shops where id = new.shop_id;

    if not v_has_deadline then
      raise exception 'Set a voting round deadline in Business profile before featuring suggestions — contests only resolve automatically now.';
    end if;

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

-- ============================================================
-- 3. finalize_suggestion_win() — add the owner notification
-- ============================================================
create or replace function finalize_suggestion_win(
  p_suggestion_id uuid,
  p_shop_id uuid,
  p_shop_name text,
  p_customer_id uuid,
  p_reward text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempts int := 0;
  v_suggestion_text text;
  v_voter record;
  v_owner_id uuid;
begin
  if exists (select 1 from suggestion_prizes where suggestion_id = p_suggestion_id) then
    return false;
  end if;

  select suggestion into v_suggestion_text from deal_suggestions where id = p_suggestion_id;
  select owner_id into v_owner_id from shops where id = p_shop_id;

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

  -- The winning submitter — their prize
  insert into notifications (customer_id, message)
  values (
    p_customer_id,
    'Your suggestion won at ' || p_shop_name || '! Check My Offers to redeem your prize.'
  );

  -- Everyone who voted for the winning suggestion (excluding the
  -- submitter, already notified above)
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

  -- The business owner — new in this migration
  if v_owner_id is not null then
    insert into notifications (customer_id, message)
    values (
      v_owner_id,
      'Your suggestion contest resolved — "' || left(v_suggestion_text, 60) || '" is now live as a promotion.'
    );
  end if;

  return true;
end;
$$;
