# LocalPulse

LocalPulse is a local-deals platform: business owners publish offers and run
contests, while customers browse shops, claim deals, suggest ideas, and vote.

This repository combines both halves of the project:

## `app/` — Owner & Customer web app
A Next.js (App Router + TypeScript + Tailwind) application covering owner
dashboards, shop management, browsing, claiming/redeeming offers, suggestions,
billing, referrals, and notifications.

```bash
cd app
cp .env.example .env.local   # fill in your Supabase / Stripe keys
npm install
npm run dev
```

## `backend/` — Supabase backend
Database schema, SQL migrations, RLS policies, RPC functions, and Supabase edge
functions (Stripe webhook, redeem-offer).

Apply the schema and migrations to your Supabase project in order, starting with
`schema.sql`. See `backend/README-ORIGINAL.md` and `backend/CHANGES.md` for details.

## Environment

Copy the `.env.example` files and provide your own credentials. **Never commit
real secrets** — `.env` files are gitignored.
