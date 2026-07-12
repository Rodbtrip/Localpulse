-- ============================================================
-- Fix: gen_random_bytes(integer) does not exist in claim_offer()
-- ============================================================
-- claim_offer() (rpc-functions.sql) sets `search_path = public` only.
-- On Supabase-managed Postgres, pgcrypto — and therefore
-- gen_random_bytes() — is installed in the `extensions` schema, not
-- `public`. Since search_path never includes `extensions`, every call
-- to claim_offer() threw 42883 "function gen_random_bytes(integer)
-- does not exist" before the INSERT ever ran, which is why
-- claimed_offers had zero rows and "Claim this offer" silently failed
-- with no code and no visible error (the RPC error was being caught
-- but not surfaced until diagnostic logging was added).
--
-- Same root-cause class as the get_top_suggestions() ambiguous-id fix
-- (search_path not covering something the function body assumes is
-- reachable) — different manifestation. Fix: schema-qualify the call
-- as extensions.gen_random_bytes(5) instead of widening search_path,
-- so this doesn't silently break again if search_path changes
-- elsewhere. No other changes to claim_offer().

create or replace function claim_offer(p_promotion_id uuid)
returns table (id uuid, code text, status text, claimed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_shop_id uuid;
  v_max int;
  v_current_count int;
  v_code text;
  v_attempts int := 0;
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  select shop_id, max_redemptions
    into v_shop_id, v_max
    from promotions
    where promotions.id = p_promotion_id
      and is_active = true
      and start_time <= now()
      and end_time >= now()
    for update;

  if v_shop_id is null then
    raise exception 'Promotion not found or not currently active';
  end if;

  if v_max is not null then
    select count(*) into v_current_count
      from claimed_offers
      where claimed_offers.promotion_id = p_promotion_id
        and claimed_offers.status in ('claimed', 'redeemed');

    if v_current_count >= v_max then
      raise exception 'This offer has reached its redemption limit';
    end if;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 8));

    begin
      insert into claimed_offers (promotion_id, shop_id, customer_id, code, status)
      values (p_promotion_id, v_shop_id, v_customer_id, v_code, 'claimed');
      exit;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'Could not generate a unique redemption code, please try again';
      end if;
    end;
  end loop;

  return query
    select claimed_offers.id, claimed_offers.code, claimed_offers.status, claimed_offers.claimed_at
    from claimed_offers
    where claimed_offers.promotion_id = p_promotion_id
      and claimed_offers.customer_id = v_customer_id
      and claimed_offers.code = v_code;
end;
$$;
