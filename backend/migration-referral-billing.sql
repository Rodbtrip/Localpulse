-- LocalPulse — Migration: subscription billing + referral program
-- Run after migration-contest-autoresolve.sql.
--
-- Two things in one migration, since the second depends on the first:
-- 1. LocalPulse itself now actually charges businesses a subscription
--    ($49/mo, single tier for MVP simplicity) via Stripe — this never
--    existed before; `subscriptions` was an unused schema stub.
-- 2. A referral program on top of it: every business gets a shareable
--    code. When someone signs up using it AND their subscription goes
--    active, the referring business gets a real Stripe account credit
--    equal to one month's fee — not a fake in-app number, an actual
--    reduction on their next invoice.

-- ============================================================
-- Carries a referral code from owner sign-up through to shop
-- creation, since the shop doesn't exist yet at sign-up time.
-- Cleared once applied.
-- ============================================================
alter table profiles
  add column if not exists pending_referral_code text;

-- ============================================================
-- Referral fields on shops
-- ============================================================
alter table shops
  add column if not exists referral_code text unique,
  add column if not exists referred_by_shop_id uuid references shops(id) on delete set null;

-- Auto-generate a referral code for every shop at creation time, so
-- owners never have to manually request one.
create or replace function generate_referral_code()
returns trigger
language plpgsql
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  if new.referral_code is null then
    loop
      v_attempts := v_attempts + 1;
      v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
      begin
        new.referral_code := v_code;
        exit;
      exception when unique_violation then
        if v_attempts >= 5 then
          raise exception 'Could not generate a unique referral code';
        end if;
      end;
    end loop;
  end if;
  return new;
end;
$$;

create trigger set_referral_code
before insert on shops
for each row execute function generate_referral_code();

-- Backfill referral codes for any shops that already existed before this migration
update shops set referral_code = upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))
where referral_code is null;

-- Lets a referring owner see basic info about shops they referred, even
-- before those shops go active (without this, the existing "Anyone can
-- view active shops" / "Owners can view own shop" policies would hide
-- pending referrals from the referrer's dashboard entirely).
create policy "Owners can view shops they referred"
on shops
for select
using (
  exists (
    select 1 from shops as referring
    where referring.id = shops.referred_by_shop_id
    and referring.owner_id = auth.uid()
  )
);

-- ============================================================
-- subscriptions table already exists from schema.sql — adding a
-- unique constraint on shop_id (one subscription row per shop),
-- required for the webhook's upsert-on-conflict to work correctly.
-- Recap of relevant columns: shop_id, stripe_customer_id,
-- stripe_subscription_id, plan, status.
-- ============================================================
alter table subscriptions
  add constraint subscriptions_shop_id_unique unique (shop_id);

-- ============================================================
-- referral_credits — audit log of every free month actually awarded.
-- This is separate from the Stripe balance credit itself (which is
-- the thing that actually reduces an invoice) — this table is just
-- LocalPulse's own record for the dashboard to display.
-- ============================================================
create table if not exists referral_credits (
  id uuid primary key default gen_random_uuid(),
  referring_shop_id uuid references shops(id) on delete cascade,
  referred_shop_id uuid references shops(id) on delete cascade,
  amount_credited numeric not null,
  created_at timestamp with time zone default now(),
  unique (referred_shop_id) -- a shop can only ever trigger ONE referral credit, on its first paid subscription
);

create index if not exists referral_credits_referring_shop_id_idx on referral_credits (referring_shop_id);

alter table referral_credits enable row level security;

create policy "Shop owners can view credits they've earned"
on referral_credits
for select
using (
  exists (
    select 1 from shops where shops.id = referral_credits.referring_shop_id and shops.owner_id = auth.uid()
  )
);

-- No client-facing insert policy — only written by the Stripe webhook
-- handler using the service role key, never by client code.

-- ============================================================
-- record_referral_credit() — called by the Stripe webhook handler
-- (service role, bypasses RLS entirely) when a referred shop's
-- subscription first goes active. This function ONLY logs the credit
-- for dashboard display — the actual Stripe balance credit API call
-- happens in the Edge Function itself, since that requires calling
-- out to Stripe's API, which SQL can't do.
-- ============================================================
create or replace function record_referral_credit(
  p_referred_shop_id uuid,
  p_amount numeric
)
returns boolean -- true if recorded, false if this shop already triggered a credit before
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referring_shop_id uuid;
begin
  select referred_by_shop_id into v_referring_shop_id
  from shops where id = p_referred_shop_id;

  if v_referring_shop_id is null then
    return false; -- this shop wasn't referred by anyone
  end if;

  insert into referral_credits (referring_shop_id, referred_shop_id, amount_credited)
  values (v_referring_shop_id, p_referred_shop_id, p_amount)
  on conflict (referred_shop_id) do nothing;

  return found;
end;
$$;

-- Not granted to authenticated — only the service role (used by the
-- Edge Function) can call this.
