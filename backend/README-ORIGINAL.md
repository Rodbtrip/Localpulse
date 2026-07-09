# CoffeeConnect OS — Complete Startup & App Blueprint

## Mission

CoffeeConnect OS is a growth platform for independent coffee shops. The goal is to help coffee shops bring in more customers during slow hours, increase repeat visits, and eventually become the customer engagement operating system for local neighborhood businesses.

The first MVP should focus on one core outcome:

> A coffee shop owner can create a promotion, and a customer can claim and redeem that promotion in-store.

---

## 1. Business Concept

### Core Problem

Independent coffee shops often struggle with:

- Slow afternoon traffic
- Weak repeat-customer systems
- Limited marketing resources
- Poor customer data
- Difficulty competing with large chains
- Low visibility outside Google Maps, Yelp, and social media

### Core Solution

CoffeeConnect OS helps shops launch time-based offers, attract nearby customers, track redemptions, and understand what promotions actually work.

### Positioning

Do not position this as simply a coffee app.

Position it as:

> The growth platform for independent coffee shops.

Long-term positioning:

> Customer engagement infrastructure for independent neighborhood businesses.

Coffee shops are the beachhead market. The platform can later expand to bakeries, cafés, tea shops, juice bars, bookstores, restaurants, salons, and other local businesses.

---

## 2. MVP Scope

### Build First

The MVP must do only these things:

#### Customer App

- Sign up / log in
- View nearby coffee shops
- View active offers
- Claim an offer
- Show redemption code or QR code
- View claimed offers
- Save favorite shops

#### Coffee Shop Dashboard

- Sign up / log in
- Create shop profile
- Create promotion
- Schedule promotion
- View claimed offers
- Redeem customer code
- View basic analytics

#### Admin Dashboard

- Approve shops
- View all shops
- Disable abusive/fake shops
- View platform activity

### Do Not Build Yet

Avoid these features in Version 1:

- Mobile ordering
- In-app payments for drinks
- Complex loyalty system
- AI recommendations
- Social feed
- Reviews
- Friend system
- Event system
- Gift cards
- Subscriptions for customers

The goal is to prove this:

> Can CoffeeConnect generate measurable customer redemptions for shops?

---

## 3. Recommended Tech Stack

### Web Dashboard

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Vercel hosting

### Mobile App

- React Native
- Expo
- EAS Build

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Edge Functions
- Row Level Security

### Payments

- Stripe Billing for shop subscriptions
- Stripe Connect later if marketplace payouts are needed

### Analytics

- PostHog
- Supabase logs
- Custom database metrics

### Developer Tooling

- pnpm
- Turborepo
- ESLint
- Prettier
- GitHub
- GitHub Actions later for CI/CD

---

## 4. App Architecture

Use a monorepo.

```txt
coffeeconnect/
  apps/
    web/
      app/
      components/
      lib/
      actions/
      middleware.ts
    mobile/
      app/
      components/
      lib/
      screens/
  packages/
    database/
    types/
    ui/
    config/
  supabase/
    migrations/
    functions/
  docs/
  README.md
  package.json
```

---

## 5. Web Dashboard Routes

```txt
/
  Landing page

/auth/sign-in
/auth/sign-up

/dashboard
  Owner overview

/dashboard/shop
  Shop profile management

/dashboard/promotions
  List all promotions

/dashboard/promotions/new
  Create promotion

/dashboard/redemptions
  Redeem customer code

/dashboard/customers
  Customer activity

/dashboard/analytics
  Promotion performance

/dashboard/billing
  Stripe subscription

/dashboard/settings
  Account settings

/admin
  Admin overview

/admin/shops
  Approve or disable shops

/admin/users
  User management

/admin/promotions
  Promotion moderation
```

---

## 6. Mobile App Screens

```txt
Home
Nearby Offers
Shop Details
Claim Offer
My Claimed Offers
Redeem QR / Code
Favorites
Profile
Settings
```

---

## 7. Database Schema

Use PostgreSQL through Supabase.

```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('customer', 'owner', 'admin')) default 'customer',
  created_at timestamp with time zone default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  logo_url text,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percent', 'fixed', 'bogo', 'custom')),
  discount_value numeric,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  max_redemptions int,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table claimed_offers (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references promotions(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  code text unique not null,
  status text check (status in ('claimed', 'redeemed', 'expired')) default 'claimed',
  claimed_at timestamp with time zone default now(),
  redeemed_at timestamp with time zone
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  claimed_offer_id uuid references claimed_offers(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,
  amount_spent numeric,
  created_at timestamp with time zone default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(customer_id, shop_id)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text check (plan in ('starter', 'growth', 'pro')),
  status text,
  created_at timestamp with time zone default now()
);
```

---

## 8. Row Level Security

Enable RLS.

```sql
alter table profiles enable row level security;
alter table shops enable row level security;
alter table promotions enable row level security;
alter table claimed_offers enable row level security;
alter table redemptions enable row level security;
alter table favorites enable row level security;
alter table subscriptions enable row level security;
```

### Profiles

```sql
create policy "Users can read own profile"
on profiles
for select
using (id = auth.uid());

create policy "Users can update own profile"
on profiles
for update
using (id = auth.uid());
```

### Shops

```sql
create policy "Anyone can view active shops"
on shops
for select
using (is_active = true);

create policy "Owners can create shops"
on shops
for insert
with check (owner_id = auth.uid());

create policy "Owners can update own shops"
on shops
for update
using (owner_id = auth.uid());
```

### Promotions

```sql
create policy "Anyone can view active promotions"
on promotions
for select
using (
  is_active = true
  and start_time <= now()
  and end_time >= now()
);

create policy "Owners can create promotions for own shops"
on promotions
for insert
with check (
  exists (
    select 1 from shops
    where shops.id = promotions.shop_id
    and shops.owner_id = auth.uid()
  )
);

create policy "Owners can update promotions for own shops"
on promotions
for update
using (
  exists (
    select 1 from shops
    where shops.id = promotions.shop_id
    and shops.owner_id = auth.uid()
  )
);
```

### Claimed Offers

```sql
create policy "Customers can view own claimed offers"
on claimed_offers
for select
using (customer_id = auth.uid());

create policy "Customers can claim offers"
on claimed_offers
for insert
with check (customer_id = auth.uid());

create policy "Shop owners can view claims for own shop"
on claimed_offers
for select
using (
  exists (
    select 1 from shops
    where shops.id = claimed_offers.shop_id
    and shops.owner_id = auth.uid()
  )
);
```

---

## 9. Key Backend Logic

### Claim Offer Flow

1. Customer taps Claim.
2. App checks whether promotion is active.
3. App checks whether max redemptions has been reached.
4. App creates a unique claim code.
5. App stores claimed offer.
6. Customer shows code or QR in store.

### Redeem Offer Flow

1. Owner enters or scans code.
2. Dashboard checks if code exists.
3. Dashboard checks if code is still claimed.
4. Dashboard marks offer redeemed.
5. Dashboard creates redemption record.
6. Analytics update automatically.

---

## 10. Sample Supabase Client

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 11. Sample Claim Offer Function

```ts
import { supabase } from "./supabase";

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function claimOffer({
  promotionId,
  shopId,
  customerId,
}: {
  promotionId: string;
  shopId: string;
  customerId: string;
}) {
  const code = generateCode();

  const { data, error } = await supabase
    .from("claimed_offers")
    .insert({
      promotion_id: promotionId,
      shop_id: shopId,
      customer_id: customerId,
      code,
      status: "claimed",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}
```

---

## 12. Sample Redeem Offer Function

```ts
import { supabase } from "./supabase";

export async function redeemOffer(code: string, amountSpent?: number) {
  const { data: claimedOffer, error } = await supabase
    .from("claimed_offers")
    .select("*")
    .eq("code", code)
    .eq("status", "claimed")
    .single();

  if (error || !claimedOffer) {
    throw new Error("Invalid or already redeemed code.");
  }

  const { error: updateError } = await supabase
    .from("claimed_offers")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", claimedOffer.id);

  if (updateError) throw new Error(updateError.message);

  const { error: redemptionError } = await supabase
    .from("redemptions")
    .insert({
      claimed_offer_id: claimedOffer.id,
      shop_id: claimedOffer.shop_id,
      customer_id: claimedOffer.customer_id,
      amount_spent: amountSpent ?? null,
    });

  if (redemptionError) throw new Error(redemptionError.message);

  return { success: true };
}
```

---

## 13. Dashboard Metrics

Track these:

- Total offers created
- Active offers
- Total claimed offers
- Total redeemed offers
- Redemption rate
- Estimated revenue influenced
- Best-performing promotion
- Repeat customers
- Customer growth
- Claims by day
- Redemptions by hour

### Formula

```txt
redemption_rate = redeemed_offers / claimed_offers
```

### Example

If 100 people claim an offer and 32 redeem it:

```txt
32 / 100 = 32% redemption rate
```

---

## 14. Pricing Model

Start simple.

### Starter — $49/month

- 1 location
- 5 promotions per month
- Basic analytics

### Growth — $99/month

- Unlimited promotions
- Customer insights
- Basic loyalty
- Email capture

### Pro — $199/month

- AI recommendations
- Advanced analytics
- Multi-location support
- Featured placement

At launch, you can offer:

> Free for 60 days. After that, $49/month if you want to continue.

---

## 15. Launch Strategy

### Start Local

Start in Frederick, Maryland.

### Founder Pitch

Use this pitch:

> I’m building a platform to help independent coffee shops bring in more customers during slow hours. I’m looking for 5 local shops to test it for free for 60 days. You’ll be able to create promotions, track redemptions, and see whether the platform drives real traffic.

### Pilot Offer

Give shops:

- Free setup
- Free first 60 days
- Free listing photos
- Weekly report
- No long-term contract
- Founder support

### Customer Acquisition

Use:

- TikTok
- Instagram Reels
- Local Facebook groups
- UMGC communities
- Flyers with QR codes
- Coffee shop counter cards
- Frederick Coffee Passport challenge

---

## 16. 90-Day Execution Plan

### Days 1–15

- Interview 25 shop owners
- Interview 50 coffee customers
- Create Figma wireframes
- Pick final MVP features
- Set up GitHub repository
- Set up Supabase project
- Set up Vercel project

### Days 16–30

- Build authentication
- Build profile table
- Build shop onboarding
- Build owner dashboard shell
- Build mobile app shell
- Create database migrations

### Days 31–45

- Build promotion creation
- Build active promotion listing
- Build customer offer feed
- Build offer claim flow
- Add code generation

### Days 46–60

- Build redemption flow
- Build analytics basics
- Build admin shop approval
- Add favorites
- Add error handling
- Test with fake data

### Days 61–75

- Add 3–5 real shops
- Add real promotions
- Run live pilot
- Collect customer feedback
- Fix bugs
- Improve UI

### Days 76–90

- Launch local campaign
- Run Frederick Coffee Week
- Track redemptions
- Create case studies
- Convert shops to paid plans

---

## 17. Business Metrics

Track weekly:

- Active shops
- Active customers
- Offers created
- Offers claimed
- Offers redeemed
- Redemption rate
- Revenue influenced
- Monthly recurring revenue
- Shop churn
- Customer retention
- Cost to acquire each shop
- Cost to acquire each customer

The most important early metric:

> Can you generate measurable redemptions for coffee shops?

---

## 18. Legal and Operations

Eventually create:

- LLC
- EIN
- Business bank account
- Stripe account
- Privacy policy
- Terms of service
- Merchant agreement
- Refund policy
- Data policy
- Basic liability insurance

Keep legal simple at first, but do not ignore privacy and payments once real users join.

---

## 19. Product Roadmap

### Version 1

Promotions and redemptions.

### Version 2

Basic loyalty points.

### Version 3

Customer analytics.

### Version 4

Email/SMS marketing.

### Version 5

AI promotion recommendations.

### Version 6

Coffee passport.

### Version 7

Events.

### Version 8

Multi-location brands.

### Version 9

Customer subscriptions.

### Version 10

Expansion beyond coffee shops.

---

## 20. Founder Operating System

Weekly schedule:

### Monday

Customer interviews.

### Tuesday

Product design.

### Wednesday

Development.

### Thursday

Coffee shop visits.

### Friday

Testing and bug fixes.

### Saturday

Marketing content.

### Sunday

Metrics review and weekly planning.

---

## 21. First Build Milestone

Do not try to build the whole company first.

Your first milestone:

> A coffee shop owner creates a promotion. A customer claims it. The customer redeems it in-store. The owner sees the redemption.

That is the proof-of-concept.

Once that works, the rest of the business can grow around it.

---

## 22. Final Build Philosophy

Build in this order:

1. Business validation
2. Clickable design
3. Database
4. Authentication
5. Owner dashboard
6. Customer app
7. Claim/redeem system
8. Analytics
9. Pilot shops
10. Paid conversions

Do not build based on imagination alone.

Build based on evidence from real coffee shop owners and real customers.
