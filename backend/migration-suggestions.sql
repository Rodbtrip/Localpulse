-- CoffeeConnect OS — Migration: customer deal suggestions
-- Run after migration-categories.sql.

create table if not exists deal_suggestions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  suggestion text not null,
  status text check (status in ('new', 'reviewed', 'implemented', 'declined')) default 'new',
  created_at timestamp with time zone default now()
);

create index if not exists deal_suggestions_shop_id_idx on deal_suggestions (shop_id);
create index if not exists deal_suggestions_customer_id_idx on deal_suggestions (customer_id);

alter table deal_suggestions enable row level security;

-- Customers can submit and view their own suggestions
create policy "Customers can submit suggestions"
on deal_suggestions
for insert
with check (customer_id = auth.uid());

create policy "Customers can view own suggestions"
on deal_suggestions
for select
using (customer_id = auth.uid());

-- Shop owners can view and update (mark reviewed/implemented) suggestions for their own shop
create policy "Shop owners can view suggestions for own shop"
on deal_suggestions
for select
using (
  exists (
    select 1 from shops
    where shops.id = deal_suggestions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Shop owners can update status of own shop's suggestions"
on deal_suggestions
for update
using (
  exists (
    select 1 from shops
    where shops.id = deal_suggestions.shop_id
    and shops.owner_id = auth.uid()
  )
);

-- Admins can view everything (uses is_admin() from rpc-functions.sql)
create policy "Admins can view all suggestions"
on deal_suggestions
for select
using (is_admin());
