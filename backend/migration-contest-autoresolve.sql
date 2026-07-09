-- LocalPulse — Migration: automatic contest resolution
-- Run after migration-curated-featured.sql.
--
-- Lets a business set a deadline for the current voting round. When
-- that deadline passes, the system automatically:
--   1. Finds the #1 voted featured suggestion
--   2. Awards that customer a prize (same as manually marking
--      "Implemented" — the manual path still works too, for businesses
--      that don't want to use a deadline)
--   3. Publishes the suggestion as a real promotion on the business's
--      Promotions page
--   4. Sends the winning customer an in-app notification
--   5. Resets the round (un-features everything, clears the deadline)
--      so the business picks a fresh top 3 next time

alter table shops
  add column if not exists suggestion_contest_ends_at timestamptz;

comment on column shops.suggestion_contest_ends_at is
  'When set, the current featured-suggestion voting round auto-resolves at this time. Null means no deadline is active — the business can still resolve manually via the existing "Implemented" status.';

-- ============================================================
-- notifications — minimal in-app notification store. This is the
-- "ping": customers see it next time they open the app. It is NOT an
-- email, push notification, or text message — that requires wiring up
-- a separate provider (e.g. Resend for email, Twilio for SMS).
-- ============================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamp with time zone default now()
);

create index if not exists notifications_customer_id_idx on notifications (customer_id, read);

alter table notifications enable row level security;

create policy "Customers can view own notifications"
on notifications
for select
using (customer_id = auth.uid());

create policy "Customers can mark own notifications read"
on notifications
for update
using (customer_id = auth.uid());

-- No insert policy — notifications are only ever created by
-- resolve_expired_suggestion_contests() below (SECURITY DEFINER).

-- ============================================================
-- resolve_expired_suggestion_contests() — the automatic resolution.
-- Intentionally NOT granted to `authenticated` — this runs as a
-- system/scheduled job (see cron setup below), not something any
-- logged-in user can trigger for arbitrary shops.
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
  v_code text;
  v_attempts int;
  v_promo_title text;
begin
  for v_shop in
    select id, name, suggestion_reward
    from shops
    where suggestion_contest_ends_at is not null
      and suggestion_contest_ends_at <= now()
  loop
    -- Find the #1 voted featured suggestion for this shop
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

      -- Award the prize (skip if somehow already awarded for this suggestion)
      if not exists (select 1 from suggestion_prizes where suggestion_id = v_winner.id) then
        v_attempts := 0;
        loop
          v_attempts := v_attempts + 1;
          v_code := 'SP-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
          begin
            insert into suggestion_prizes (shop_id, customer_id, suggestion_id, prize_description, code)
            values (v_shop.id, v_winner.customer_id, v_winner.id, v_shop.suggestion_reward, v_code);
            exit;
          exception when unique_violation then
            if v_attempts >= 5 then exit; end if;
          end;
        end loop;

        update deal_suggestions set status = 'implemented' where id = v_winner.id;

        -- Publish the winning suggestion as a real promotion
        v_promo_title := left(v_winner.suggestion, 100);
        insert into promotions (
          shop_id, title, description, discount_type, discount_value,
          start_time, end_time, max_redemptions, is_active
        ) values (
          v_shop.id,
          v_promo_title,
          'Published automatically — the #1 customer-voted suggestion.',
          'custom',
          null,
          now(),
          now() + interval '7 days',
          null,
          true
        );

        -- The "ping" — in-app notification only, see comment above
        insert into notifications (customer_id, message)
        values (
          v_winner.customer_id,
          'Your suggestion won at ' || v_shop.name || '! Check My Offers to redeem your prize.'
        );
      end if;
    end if;

    -- Reset the round regardless of whether a winner was found, so a
    -- business with zero votes cast doesn't get stuck in limbo
    update deal_suggestions set featured = false where shop_id = v_shop.id and featured = true;
    update shops set suggestion_contest_ends_at = null where id = v_shop.id;
  end loop;
end;
$$;

-- ============================================================
-- Scheduling — requires the pg_cron extension. On Supabase:
-- Dashboard → Database → Extensions → enable "pg_cron", then run the
-- lines below. If pg_cron isn't available on your plan, skip this and
-- call resolve_expired_suggestion_contests() manually/periodically
-- instead (e.g. via Supabase's dashboard Cron Jobs UI calling this as
-- an RPC, or any external scheduler hitting a small Edge Function that
-- calls it).
-- ============================================================
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'resolve-suggestion-contests',
--   '*/10 * * * *', -- every 10 minutes
--   $$select resolve_expired_suggestion_contests();$$
-- );
