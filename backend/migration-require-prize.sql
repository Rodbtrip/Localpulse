-- LocalPulse — Migration: require a prize before accepting suggestions
-- Run after migration-suggestion-prizes.sql.
--
-- Enforces the "both sides win" rule at the database level, not just
-- in the UI: a business cannot collect customer suggestions at all
-- unless it has something on offer for the winner. This closes the
-- loophole of using the suggestion box as free idea-mining with
-- nothing given back to the customer who provided the winning idea.

drop policy if exists "Customers can submit suggestions" on deal_suggestions;

create policy "Customers can submit suggestions"
on deal_suggestions
for insert
with check (
  customer_id = auth.uid()
  and exists (
    select 1 from shops
    where shops.id = deal_suggestions.shop_id
    and shops.suggestion_reward is not null
    and trim(shops.suggestion_reward) <> ''
  )
);
