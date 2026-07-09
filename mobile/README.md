# LocalPulse — Mobile App (Expo / React Native)

The native iOS and Android app for LocalPulse. It connects to the same Supabase project (`ymjajjhasykdlppkqcbv`) as the Next.js platform — same auth, same tables from the 19 migrations, same `redeem-offer` Edge Function — so the app and the web platform stay in sync automatically.

## What's in the app

**Entry:** role selector ("I'm a Business Owner" / "I'm a Local Member") → sign in / create account. Role is stored in Supabase auth user metadata and routes each session to the right experience.

**Customer experience**
- Explore: nearby subscribed businesses using device location + the PostGIS `nearby_shops` RPC, with category pills and a 5/10/25/50-mile radius picker (graceful fallback listing when location permission is denied)
- Shop detail: prize banner, blind Deal Contest voting (one vote per contest, locked after casting, results hidden), suggestion box, and offer claiming that generates a pulse code

**Owner experience** (bottom tabs)
- Overview: live status, active promotions, claims, redemptions, redemption rate
- Promotions: list, create, pause/resume
- Deal Contest: feature up to 3 suggestions (enforced), requires a voting deadline first, status cycling, Won state — resolution remains automatic via `pg_cron` on the backend, exactly as decided
- Redeem: enters a pulse code and validates through the `redeem-offer` Edge Function
- Profile: name, category, description, contest prize, voting round deadline
- More → Referrals (copyable link, free months earned, referred list) and Billing ($49/mo plan status; subscription management opens the web billing page in a browser, which keeps you compliant with app store billing rules since Stripe handles it)

## Run it locally

```bash
cd localpulse-mobile
cp .env.example .env        # then paste your Supabase anon key into .env
pnpm install
npx expo install --fix      # aligns every Expo package to SDK-compatible versions
npx expo start
```

The `expo install --fix` step matters: it corrects any dependency version that doesn't match the Expo SDK, so a stale pin can never break the build.

Scan the QR code with the Expo Go app on your iPhone or Android phone and the app runs live against your Supabase project. Edits hot-reload instantly.

## Schema verified against the real platform

The data layer (`lib/api.ts`) was checked line-by-line against the actual platform code in LocalPulse_Owner_Dashboard. It uses the exact tables (`shops`, `promotions`, `deal_suggestions`, `suggestion_votes`, `claimed_offers`, `suggestion_prizes`, `subscriptions`, `referral_credits`, `notifications`), the exact RPCs (`claim_offer` for atomic race-safe claiming, `cast_vote`, `get_top_suggestions` for the blind poll, `nearby_shops` with radius in meters, `redeem_suggestion_prize`), and the same redemption routing: SP- prefixed prize codes go to the RPC, all other codes go through the `redeem-offer` Edge Function with optional amount-spent tracking. The 23-category list mirrors `lib/categories.ts` and the `shops_category_check` constraint.

## Brand assets

The LocalPulse logo is wired throughout: `assets/icon.png` (app icon, pin mark on warm paper), `assets/adaptive-icon.png` (Android adaptive foreground), `assets/splash-icon.png` (full wordmark splash), and `assets/logo-wordmark.png` (in-app, transparent background) shown on the role selector, sign-in/up, customer explore, and owner overview. All assets were extracted with the Bazaart watermark removed — for the crispest store listing later, a clean vector (SVG) export of the logo would be worth having.

## Ship it to the app stores

1. Create a free Expo account, then: `npm install -g eas-cli && eas login`
2. `eas build --platform ios` and `eas build --platform android` (EAS builds in the cloud — no Xcode required)
3. Apple: enroll in the Apple Developer Program ($99/year), then `eas submit --platform ios`
4. Google: create a Play Console account ($25 one-time), then `eas submit --platform android`

Once live, the marketing site's app install CTAs can point at the real store listings.


## Pip — the built-in assistant

Pip (the LocalPulse pin as a mascot) is a working assistant, not decoration. The floating Pip button appears on the member's Nearby and My Offers screens and the owner's Overview.

**Members — deal finder + guide.** Type what you want ("pizza", "haircut", "coffee near me") and Pip searches every live promotion: keyword matching across promotion titles, descriptions, shop names, and categories, with a synonym layer so "latte" finds coffee shops and "fade" finds barbershops. Results are relevance-ranked and each one deep-links straight to the shop page for claiming. How-it-works questions (voting, claiming, prizes, codes, radius) get instant answers.

**Owners — live-data answers.** "When does my contest end?" reads the real deadline from their shop. "How am I doing?" reports live claims, redemptions, and redemption rate. Plus instant answers on featuring rules, SP- codes, statuses, referrals, billing, and visibility.

Everything runs on-device against Supabase — no external AI calls, no API keys, nothing to configure. The engine lives in `lib/pip.ts` (synonym map, tokenizer, ranking, FAQ intents) and the UI in `components/PipAssistant.tsx`; the mascot asset is `assets/pip.png`. When you're ready, the same component can be upgraded to a full conversational assistant on the Claude API without changing where it lives in the app.

## Legal documents & account deletion

**Documents.** Three drafts ship in the app and as markdown (`legal/` folder): Terms of Service, Privacy Policy, and Deal Contest Official Rules. They are readable in-app from: sign-up (agreement links), the owner More menu, the Billing screen footer, and the member My Offers footer. ⚠️ **These are attorney-review drafts** — every [BRACKETED] placeholder (entity name, address, state, contact emails, arbitration language) must be completed and the whole set reviewed by counsel before launch. The Contest Rules especially: prize promotions are regulated under state sweepstakes law (registration/bonding in some states) — this remains the flagged launch blocker.

**Deactivation & deletion.**
- Owners (More → Billing → Account): "Take my business offline" instantly hides all listings (reversible with one tap), and "Delete my account" permanently removes the login and personal data after a double confirmation. The screen warns that Stripe subscriptions must be cancelled separately.
- Members (My Offers → Account): "Delete my account" with the same double confirmation.
- Permanent deletion runs through a new **`delete-account` Edge Function** (in `supabase/functions/delete-account/`) — the only safe way to remove an auth user, since it requires the service role. Deploy it once with `supabase functions deploy delete-account`. Until deployed, the app shows a clear fallback message instead of failing silently. Review your foreign-key ON DELETE behavior so activity records (claims, votes, suggestions) end up retained or removed in line with the Privacy Policy.

In-app account deletion is an App Store requirement (Guideline 5.1.1) for any app with account creation — this implementation satisfies it.

## Audit fix pass (applied)

All 28 audit findings were addressed. The important behavioral contracts now match the web platform exactly: role and full name live in `profiles` (with self-healing for accounts missing a row), sign-up collects full name and parks referral codes in `pending_referral_code`, the Profile tab creates the shop on first save with referral resolution (mirroring web `upsertShop`), Billing is reachable via the More menu, discount types are `percent | fixed | bogo | custom`, suggestion submits are prize-gated with friendly errors and a 500-character cap, the won status is `implemented`, owner stats count the `redemptions` table, dates are strictly validated (`lib/dates.ts`), redemption errors surface the Edge Function's real message, the location-denied feed labels itself honestly, notifications require an explicit dismiss, and every list screen has error + retry states.
