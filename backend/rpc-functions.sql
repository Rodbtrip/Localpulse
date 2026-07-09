-- CoffeeConnect OS — Database Functions (new file)
-- Run after schema.sql, before rls-policies.sql.

-- ============================================================
-- is_admin() — used throughout rls-policies.sql
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  );
$$;

-- ============================================================
-- claim_offer(promotion_id) — replaces the client-side claim logic
-- ============================================================
-- Fixes two issues in the original blueprint:
-- 1. Race condition: two customers claiming the last available slot
--    at the same time could both succeed, since the max_redemptions
--    check and the insert weren't atomic. This function locks the
--    promotion row (FOR UPDATE) for the duration of the check+insert,
--    so concurrent claims are safely serialized.
-- 2. Unsafe code generation: Math.random() client-side isn't
--    cryptographically random and had no collision-retry handling.
--    This generates codes with pgcrypto's gen_random_bytes and retries
--    on the rare unique_violation instead of surfacing a raw DB error.
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

  -- Lock the promotion row so concurrent claims for the same promotion
  -- are processed one at a time, closing the race condition.
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
    -- hex encoding only ever produces 0-9a-f, so the code length is
    -- always predictable (unlike base64, which includes +/= and would
    -- need stripping that could shorten the result unpredictably)
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));

    begin
      insert into claimed_offers (promotion_id, shop_id, customer_id, code, status)
      values (p_promotion_id, v_shop_id, v_customer_id, v_code, 'claimed');
      exit;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'Could not generate a unique redemption code, please try again';
      end if;
      -- otherwise loop and try a new code
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

-- Only logged-in customers may call this — enforced both here and by
-- the v_customer_id null check inside the function body.
grant execute on function claim_offer(uuid) to authenticated;
