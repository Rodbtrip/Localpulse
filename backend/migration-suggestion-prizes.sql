-- LocalPulse — Migration: suggestion prizes (replaces platform credits)
-- Run after migration-rebrand-fixes.sql.
--
-- Each business sets what they're giving away to whoever submits the
-- #1 voted suggestion (e.g. "Free 12oz drink of your choice"). This is
-- shown to customers so they know what they're voting for, and the
-- reward is redeemable ONLY at that business — unlike the earlier
-- cross-business platform-credit design this supersedes.

alter table shops
  add column if not exists suggestion_reward text;

comment on column shops.suggestion_reward is
  'What the business is giving away to whoever submits the #1 voted suggestion. Null means no reward currently configured.';

create table if not exists suggestion_prizes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  suggestion_id uuid references deal_suggestions(id) on delete set null unique, -- one prize per suggestion, ever
  prize_description text not null, -- snapshot of shops.suggestion_reward at award time
  code text unique not null,
  status text check (status in ('unredeemed', 'redeemed')) default 'unredeemed',
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists suggestion_prizes_shop_id_idx on suggestion_prizes (shop_id);
create index if not exists suggestion_prizes_customer_id_idx on suggestion_prizes (customer_id);

alter table suggestion_prizes enable row level security;

create policy "Customers can view own suggestion prizes"
on suggestion_prizes
for select
using (customer_id = auth.uid());

create policy "Shop owners can view prizes for own shop"
on suggestion_prizes
for select
using (
  exists (
    select 1 from shops where shops.id = suggestion_prizes.shop_id and shops.owner_id = auth.uid()
  )
);

-- No client-facing insert/update policies — only the two SECURITY
-- DEFINER functions below can create or redeem a prize.

-- ============================================================
-- award_suggestion_prize() — called when a suggestion is marked
-- 'implemented'; only awards if it's currently the top-voted
-- suggestion for its shop AND the shop has a reward configured.
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
  v_top_suggestion_id uuid;
  v_already_awarded boolean;
  v_code text;
  v_attempts int := 0;
begin
  select shop_id, customer_id into v_shop_id, v_customer_id
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

  select suggestion_reward into v_reward from shops where id = v_shop_id;
  if v_reward is null or trim(v_reward) = '' then
    return query select false, 'No reward configured for this business yet';
    return;
  end if;

  select ds.id into v_top_suggestion_id
  from deal_suggestions ds
  left join suggestion_votes sv on sv.suggestion_id = ds.id
  where ds.shop_id = v_shop_id
  group by ds.id
  order by count(sv.id) desc, ds.created_at asc
  limit 1;

  if v_top_suggestion_id is distinct from p_suggestion_id then
    return query select false, 'This suggestion is not (or is no longer) the #1 voted one';
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

grant execute on function award_suggestion_prize(uuid) to authenticated;

-- ============================================================
-- redeem_suggestion_prize() — ONLY the specific business that
-- configured and owes the prize can redeem it (unlike the earlier
-- any-shop platform credit design).
-- ============================================================
create or replace function redeem_suggestion_prize(p_code text)
returns table (prize_description text, customer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_prize record;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_prize
  from suggestion_prizes
  where code = upper(p_code) and status = 'unredeemed'
  for update;

  if v_prize.id is null then
    raise exception 'Invalid or already-redeemed prize code';
  end if;

  if not exists (
    select 1 from shops where shops.id = v_prize.shop_id and shops.owner_id = v_owner_id
  ) then
    raise exception 'This prize belongs to a different business and can only be redeemed there';
  end if;

  update suggestion_prizes
  set status = 'redeemed', redeemed_at = now()
  where id = v_prize.id;

  return query select v_prize.prize_description, v_prize.customer_id;
end;
$$;

grant execute on function redeem_suggestion_prize(text) to authenticated;
