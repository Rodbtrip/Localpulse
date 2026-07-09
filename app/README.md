# LocalPulse — Owner Web Dashboard

Real Next.js source code for the owner-facing MVP loop: sign up, set up a business, create promotions, redeem customer codes at the counter, see customer suggestions, and explore what other businesses on the platform are running.

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- A Supabase project with the corrected backend already applied, **in this order**:
  1. `schema.sql`
  2. `rpc-functions.sql`
  3. `rls-policies.sql`
  4. `migration-categories.sql` — adds business categories and the `nearby_shops()` search function powering `/browse`
  5. `migration-suggestions.sql` — adds the customer deal-suggestion feature
  6. `migration-suggestion-votes.sql` — adds voting on suggestions
  7. `migration-market-explore.sql` — adds the owner-side "Explore market" view
  8. `migration-rebrand-fixes.sql` — removes the old coffee-only category default now that the platform is multi-vertical
  9. `migration-suggestion-prizes.sql` — lets each business define what it gives away to the #1 voted suggestion, redeemable only at that business
  10. `migration-require-prize.sql` — enforces at the database level that a business cannot accept suggestions at all until it has a prize configured
  11. `migration-curated-featured.sql` — lets owners pick up to 3 submitted suggestions to feature for public customer voting, instead of every submission auto-competing
  12. `migration-contest-autoresolve.sql` — lets a business set a voting deadline; when it passes, the system automatically awards the #1 featured suggestion, publishes it as a real promotion, and notifies the winning customer in-app. Requires the `pg_cron` Postgres extension — see the comments at the bottom of that file for exact setup steps and a manual fallback.
  13. `migration-referral-billing.sql` — adds LocalPulse's own $49/mo business subscription (previously unbuilt) and the referral program on top of it
  14. `migration-notify-voters.sql` — unifies the manual and automatic win-resolution paths into one function, fixing a gap where the manual "Implemented" path never actually published a promotion. Also notifies everyone who voted for the winning suggestion, not just the submitter.
  15. `migration-automatic-only.sql` — removes the manual "Implemented" resolution path entirely (`award_suggestion_prize()` is dropped); contests now only resolve when the deadline passes. A business can no longer feature suggestions without a deadline set, since that's now the only way a contest ever resolves. Also adds a notification to the business owner when their contest resolves.
  16. `migration-wider-categories.sql` — expands business categories from 8 to 23, covering a much broader range of local industries (bakeries, spas, barbershops, yoga studios, bookstores, grocery, pet services, home services, photography, florists, cleaning services, childcare, tutoring, entertainment, wellness)
  17. `migration-blind-poll.sql` — reworks customer voting: one vote per contest round (not per suggestion — previously a customer could vote for multiple of the 3 featured suggestions), votes cannot be changed or undone once cast, and results (vote counts, ranking) are hidden from customers entirely until the contest resolves and a winner is published
  18. The `redeem-offer` Edge Function deployed
  19. The `stripe-webhook` Edge Function deployed (handles subscription activation and referral credits; needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `LOCALPULSE_MONTHLY_PRICE_CENTS` set as function secrets, and its URL registered in Stripe Dashboard → Webhooks listening for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`)
  (all from `LocalPulse_OS_Blueprint_FIXED.zip`, delivered earlier)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and anon key (Supabase Dashboard → Project Settings → API).

```bash
pnpm dev
```

Visit `http://localhost:3000` — you'll land on sign-up since there's no session yet.

## What's included

- **Auth** (`app/sign-in`, `app/sign-up`) — owner sign-up, Supabase Auth with cookie-based sessions via `@supabase/ssr`, protected routes enforced in `middleware.ts`
- **Business profile** (`app/dashboard/shop`) — create/update the business record customers will see, including a required category, an optional suggestion prize, and an optional voting-round deadline
- **Billing** (`app/dashboard/billing`) — LocalPulse's own $49/mo subscription via Stripe Checkout. Previously unbuilt — `subscriptions` was a schema stub with no actual payment flow. A business must subscribe to appear active/live to customers.
- **Referrals** (`app/dashboard/referrals`) — every business gets an auto-generated referral code and shareable link (`/sign-up?ref=CODE`). When a business signed up through that link subscribes for the first time, the referring business automatically gets a REAL Stripe balance credit — a negative balance transaction that reduces their actual next invoice by one month's price, not just a number shown in the dashboard. Handled entirely by the `stripe-webhook` Edge Function; the credit fires exactly once per referred shop (enforced by a unique constraint), never on renewals.
- **Automatic contest resolution** — if a business sets a "Voting round ends" time, the system automatically (via a scheduled `pg_cron` job): awards the #1 featured suggestion's customer their prize, publishes that suggestion as a real, live promotion on the business's Promotions page, sends the customer an in-app notification, and resets the round. Businesses that don't set a deadline still resolve winners manually via the existing "Implemented" status — both paths work.
- **Notifications** (`getUnreadNotifications`/`markNotificationsRead` in `lib/actions/notifications.ts`, surfaced on `/my-offers`) — the customer-facing "ping." This is in-app only — no email, push, or SMS is wired up; adding those requires a separate provider (Resend, Twilio, etc.) (coffee, restaurant, salon, fitness, retail, auto, bar, other)
- **Promotions** (`app/dashboard/promotions`) — list, create, and pause/activate promotions
- **Redeem** (`app/dashboard/redemptions`) — calls the secured `redeem-offer` Edge Function (not a direct table write), so the shop-ownership check from the corrected blueprint is enforced here too
- **Overview** (`app/dashboard`) — basic counts: active promotions, claims, redemptions, redemption rate
- **Deal Contest** (`app/dashboard/suggestions` — labeled "Deal Contest" in the UI, route path unchanged) — owners see **every** customer-submitted suggestion (not just featured ones), with vote counts, a status workflow (New/Reviewed/Declined — "Implemented" is now automatic-only, shown as a static "🎉 Won" badge), and a "Feature this" toggle to hand-pick up to 3 for public customer voting. Featuring a 4th, or featuring anything before a deadline is set, is blocked with a clear message — enforced by a database trigger, not just the UI.
- **Explore market** (`app/dashboard/explore`) — see other active businesses' currently-running promotions, filterable by category and by "nearby only," for competitive/idea research
- **Customer browse** (`app/browse`) — customers grant location access, filter by category (23 industries), pick a search radius (5/10/25/50 mi), and see nearby active offers sorted by distance, powered by the `nearby_shops()` PostGIS function
- **Blind poll voting** — on a business's page, customers vote on the 3 featured suggestions with no vote counts or ranking shown, one vote per contest round, and no way to change a vote once cast — all enforced in `cast_vote()` and `get_top_suggestions()` at the database level
- **Business detail + claim** (`app/browse/[shopId]`) — customer views a business's active promotions and claims one, calling the atomic `claim_offer()` RPC (race-condition-safe); also shows the top 3 voted suggestions with a vote button, and a form to submit a new suggestion
- **Customer sign-up** (`app/join`) — separate from owner sign-up, sets `role: 'customer'`
- **My offers** (`app/my-offers`) — customer's wallet of claimed codes, shown with the LocalPulse "pulse line" signature element, ready to show in-store; also shows any suggestion prizes earned
- **Suggestion prizes** — each business sets what it's giving away to the #1 voted suggestion (`suggestion_reward` on the shop profile — e.g. "Free 12oz drink of your choice"), shown to customers on the shop page so they know what they're voting for. When the business marks that suggestion "Implemented," the submitting customer automatically gets a prize code, redeemable **only at that business** (via `award_suggestion_prize()` and `redeem_suggestion_prize()`). Prize codes are distinguished by an `SP-` prefix on the same "Redeem a code" screen.
- **Prize required, enforced at the database level** — a business cannot accept customer suggestions at all until `suggestion_reward` is set. This isn't just a UI restriction: the RLS insert policy on `deal_suggestions` itself blocks the insert, so it can't be bypassed by calling the API directly. Customers see a clear explanation on the shop page instead of a broken-looking empty form; owners see a nudge on their Suggestions tab pointing them to set one.

## Design system

Rebranded from the original coffee-specific look to fit a multi-vertical platform:
- **Colors:** paper (`#FAF7F2`), ink (`#171B1A`), navy (sidebar), coral (`#F2542D`, primary/CTA), pulse green (`#22C55E`, live/active signal color), rose (danger)
- **Type:** Space Grotesk (display), Inter (body), JetBrains Mono (codes)
- **Signature element:** a pulsing dot + small waveform line, used on redemption codes and next to "live" states — replaces the earlier coffee-stamped-ticket motif

## What's intentionally not built yet

- No admin dashboard (business approval, moderation)
- No billing/Stripe integration on the business side
- No image upload for business logo (`logo_url` field exists in the schema, just no UI for it yet)
- `/my-offers` doesn't redirect unauthenticated visitors to sign-in — it currently just shows an empty state. Fine for MVP, worth tightening before a real launch.
- Category list is hardcoded in three places to match the database `check` constraint (`ShopForm.tsx`, `BrowseClient.tsx`, `ExploreClient.tsx`) — if you add a category, update all three plus the constraint itself

## One thing to set up in Supabase directly

New business owners get a `profiles` row created client-side in `signUp()` as a fallback, but the more reliable pattern is a Postgres trigger on `auth.users` insert that creates the `profiles` row automatically. If you want that instead of the fallback:

```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
```
