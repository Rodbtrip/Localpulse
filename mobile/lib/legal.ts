// ---------------------------------------------------------------------------
// LocalPulse legal documents — single source of truth.
// ⚠️ DRAFTS FOR ATTORNEY REVIEW. Replace every [BRACKETED] placeholder and
// have counsel review before launch — especially the Contest Rules, which
// touch state sweepstakes/lottery law (flagged as a launch blocker).
// ---------------------------------------------------------------------------

export const LEGAL_LAST_UPDATED = 'July 8, 2026';

export type LegalDocKey = 'terms' | 'privacy' | 'contest';

export const LEGAL_TITLES: Record<LegalDocKey, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  contest: 'Deal Contest Official Rules',
};

export const TERMS_OF_SERVICE = `LOCALPULSE TERMS OF SERVICE
Last updated: ${LEGAL_LAST_UPDATED}

These Terms of Service ("Terms") are a binding agreement between you and [ASCENSION GROUP LLC / LEGAL ENTITY NAME] ("LocalPulse," "we," "us"), governing your use of the LocalPulse mobile application, website, and related services (together, the "Services"). By creating an account or using the Services, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Services.

1. WHO MAY USE LOCALPULSE
You must be at least 18 years old (or the age of majority where you live) to create an account. By using the Services you represent that you meet this requirement and that any information you provide is accurate. You are responsible for your account credentials and for all activity under your account.

2. TWO KINDS OF ACCOUNTS
LocalPulse offers Member accounts (free; for discovering, voting on, and claiming offers) and Business accounts (paid subscription; for publishing promotions and running Deal Contests). Business account holders represent that they are authorized to act for the business they register, that the business is lawfully operating, and that all listing information is truthful.

3. PROMOTIONS AND REDEMPTION
Businesses — not LocalPulse — create, own, and are solely responsible for their promotions: their terms, availability, accuracy, legality, and honoring them in-store. A claimed offer produces a single-use redemption code; codes are non-transferable, have no cash value, and are void where prohibited. LocalPulse is a platform connecting businesses and members; we are not a party to any transaction between them and do not guarantee any offer.

4. THE DEAL CONTEST
Businesses may run suggestion contests in which members submit deal ideas, the business features up to three, members vote once per round, and when the business's stated deadline passes the top-voted featured suggestion is automatically implemented and its submitter receives the prize stated by the business. Contests are governed by the Deal Contest Official Rules, which are part of these Terms. NO PURCHASE IS NECESSARY to submit a suggestion or to vote, and a purchase does not improve any outcome. Each business is the sponsor of its own contest and is solely responsible for its stated prize; LocalPulse administers the mechanics.

5. SUBSCRIPTIONS AND BILLING (BUSINESS ACCOUNTS)
Business subscriptions are billed at the rate shown at sign-up (currently $[49] per month) through our payment processor, Stripe, and renew automatically each billing period until cancelled. You may cancel at any time; cancellation takes effect at the end of the current billing period and no partial-period refunds are provided except where required by law. Referral credits (one free month per referred business that subscribes) are applied automatically, are non-transferable, and have no cash value. Payment is handled on the web; app store billing is not used for subscriptions.

6. ACCOUNT DEACTIVATION AND DELETION
You may deactivate or permanently delete your account at any time from within the app (Members: My Offers → Account. Business owners: More → Billing → Account). Deactivating a business takes its listings offline; deleting an account permanently removes your login and personal data as described in the Privacy Policy. Deleting a business account does not by itself cancel a Stripe subscription — cancel your subscription first, or contact us and we will confirm cancellation. Outstanding claimed codes and awarded prizes may be voided upon deletion.

7. YOUR CONTENT
When you submit content (suggestions, business descriptions, and similar), you keep ownership of it, and you grant LocalPulse and, for suggestions, the receiving business a worldwide, royalty-free license to use, display, reproduce, and adapt that content to operate and promote the Services — including implementing a winning suggestion as a promotion. You represent that your content is yours to share and does not violate any law or right of another person.

8. ACCEPTABLE USE
You agree not to: misrepresent yourself or a business; create multiple accounts to manipulate voting or contests; buy, sell, or transfer codes or votes; submit unlawful, infringing, deceptive, hateful, or harassing content; interfere with, probe, or reverse engineer the Services; scrape the Services; or use the Services to violate any law. We may remove content, suspend, or terminate accounts that violate these Terms, and contest entries or votes obtained through manipulation are void.

9. INTELLECTUAL PROPERTY
The Services — including the LocalPulse name, logo, the Pip character, software, and design — are owned by us or our licensors and are protected by law. We grant you a limited, revocable, non-exclusive, non-transferable license to use the app for its intended purpose. No other rights are granted.

10. THIRD-PARTY SERVICES
The Services rely on third parties, including Supabase (infrastructure) and Stripe (payments), and may link to third-party sites. We are not responsible for third-party services, and your use of them may be governed by their own terms.

11. DISCLAIMERS
THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY OFFER, BUSINESS, OR PRIZE WILL MEET YOUR EXPECTATIONS.

12. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOCALPULSE AND ITS OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO THE SERVICES. OUR TOTAL LIABILITY FOR ALL CLAIMS WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM OR (B) $100. Some jurisdictions do not allow certain limitations; in those places, these limits apply to the fullest extent permitted.

13. INDEMNIFICATION
You agree to defend and hold harmless LocalPulse from claims arising out of your content, your promotions or prizes (for business accounts), your violation of these Terms, or your violation of any law or third-party right.

14. DISPUTES; GOVERNING LAW
These Terms are governed by the laws of the State of [STATE], without regard to conflict-of-law rules. [ATTORNEY TO CONFIRM: arbitration clause, class-action waiver, and venue.] Before filing any claim, you agree to contact us at [LEGAL CONTACT EMAIL] and attempt to resolve the dispute informally for 30 days.

15. CHANGES; TERMINATION
We may update these Terms; material changes will be notified in the app, and continued use after the effective date constitutes acceptance. We may suspend or end the Services or your access to them for violation of these Terms or where required by law.

16. CONTACT
[ASCENSION GROUP LLC / ENTITY NAME]
[BUSINESS ADDRESS]
[hello@localpulse.com]`;

export const PRIVACY_POLICY = `LOCALPULSE PRIVACY POLICY
Last updated: ${LEGAL_LAST_UPDATED}

This Privacy Policy explains how [ASCENSION GROUP LLC / LEGAL ENTITY NAME] ("LocalPulse," "we") collects, uses, and shares information when you use our app, website, and services.

1. INFORMATION WE COLLECT
• Account information: your name, email address, password (stored as a secure hash by our infrastructure provider), and account role (member or business owner).
• Business information (business accounts): business name, category, description, address, contact details, and location coordinates — this is public listing information shown to members.
• Location (members, optional): if you grant permission, your device location is used to show nearby businesses. Location is used at request time to run the search; we do not maintain a history of your movements. You can decline or revoke permission at any time in device settings; the app still works, without distances.
• Activity on the platform: offers you claim, codes issued and redeemed, suggestions you submit, votes you cast, prizes awarded, and (for businesses) optional amount-spent entries recorded at redemption.
• Payment information (business accounts): payments are processed by Stripe. We do not receive or store full card numbers; we receive subscription status and billing events.
• Technical data: device type, app version, and diagnostic logs necessary to operate and secure the Services.

2. HOW WE USE INFORMATION
To operate the Services (showing nearby offers, issuing and validating codes, running contests, awarding prizes, and calculating business statistics); to process subscriptions; to prevent fraud and vote manipulation; to provide support; to send service communications; and to improve the Services. We do not sell your personal information, and we do not use it for third-party advertising.

3. WHAT OTHER USERS SEE
Members: when you submit a suggestion, the business sees your first name/display name alongside it, and if it wins, you may be identified in the win announcement. Your votes are never shown to anyone — voting is blind; businesses see vote totals only, never who voted for what. Businesses: your listing information is public to members.

4. SHARING
We share information only with: service providers who run the platform under contract (Supabase for hosting/database/authentication; Stripe for payments); the specific business involved in your claim, suggestion, or prize (limited to what that interaction requires); law enforcement or others when required by law or to protect rights and safety; and a successor in a merger or acquisition, under this policy's protections.

5. RETENTION
We keep information while your account is active and as needed for the purposes above. Redemption and billing records may be retained after account deletion where required for tax, accounting, fraud-prevention, or legal purposes, in de-identified or minimal form where feasible.

6. YOUR RIGHTS AND CHOICES
• Access and correction: you can view and edit your profile and business information in the app.
• Deletion: you can permanently delete your account in the app (Members: My Offers → Account. Business owners: More → Billing → Account). Deletion removes your login and personal data, subject to the retention exceptions above.
• Location: controlled by your device permission settings.
• Depending on where you live, you may have additional rights (such as access, portability, deletion, and non-discrimination under laws like the CCPA/CPRA, or rights under the GDPR if applicable). To exercise them, use the in-app tools or contact [PRIVACY CONTACT EMAIL]. [ATTORNEY TO CONFIRM: jurisdiction-specific disclosures.]

7. CHILDREN
The Services are not directed to children and may not be used by anyone under 18. We do not knowingly collect information from children; if we learn we have, we will delete it.

8. SECURITY
We use industry-standard safeguards, including encrypted connections, hashed credentials, and database-level row security, to protect information. No system is perfectly secure; please use a strong, unique password.

9. CHANGES
We will post updates to this policy in the app and update the date above; material changes will be highlighted.

10. CONTACT
[ASCENSION GROUP LLC / ENTITY NAME] · [BUSINESS ADDRESS] · [PRIVACY CONTACT EMAIL]`;

export const CONTEST_RULES = `LOCALPULSE DEAL CONTEST — OFFICIAL RULES
Last updated: ${LEGAL_LAST_UPDATED}

⚠️ THESE RULES REQUIRE ATTORNEY REVIEW BEFORE ANY CONTEST RUNS. Prize promotions are regulated as sweepstakes or contests under state law, with state-specific registration, bonding, and disclosure requirements. Do not launch without counsel's sign-off.

NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE DOES NOT INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED.

1. SPONSOR AND ADMINISTRATOR. Each Deal Contest is sponsored by the individual business that configures it (the "Sponsor"), which is solely responsible for the prize it states. [ASCENSION GROUP LLC / ENTITY NAME] ("LocalPulse") administers the contest mechanics through the LocalPulse platform.

2. ELIGIBILITY. Open to LocalPulse members who are 18 years or older (or the age of majority in their state) at the time of entry. Employees and owners of the Sponsor, and their immediate household members, are not eligible to win that Sponsor's contest. Contests are void where prohibited or restricted by law.

3. HOW TO ENTER. Submit a deal suggestion to a participating business through the app during an open round. Entry is free. Suggestions must be your own, appropriate, and lawful; the Sponsor may decline any suggestion. Submitting multiple similar suggestions, or using multiple accounts, is grounds for disqualification.

4. SELECTION AND VOTING. The Sponsor features up to three (3) submitted suggestions for community voting. Each member may cast one (1) vote per contest round; votes are final once cast and cannot be changed. Vote counts are not displayed to voters during the round (blind poll). Votes obtained through automation, multiple accounts, purchase, or other manipulation are void.

5. WINNER DETERMINATION. When the Sponsor's posted voting deadline passes, the featured suggestion with the most valid votes is determined the winner automatically by the platform. In the event of a tie, the earlier-submitted suggestion wins. The winning suggestion is implemented as a live promotion, and the member who submitted it (the "Winner") is awarded the prize.

6. PRIZE. The prize is exactly as stated by the Sponsor in the app for that round (for example, "Free 12oz drink of your choice"). The prize is delivered automatically as a single-use code redeemable only at the Sponsor's business, is non-transferable, may not be exchanged for cash, and expires [90] days after award unless the Sponsor states otherwise. The Sponsor is solely responsible for honoring the prize. Approximate retail value is as stated or reasonably implied by the Sponsor's listing. Any tax obligations are the Winner's responsibility.

7. ODDS. Winning depends on the number and quality of entries, the Sponsor's featuring decisions, and community votes; odds cannot be calculated in advance.

8. WINNER NOTIFICATION AND PUBLICITY. The Winner is notified in-app. By entering, and except where prohibited, entrants agree that the Sponsor and LocalPulse may display the winning suggestion and the Winner's first name within the app in connection with the result.

9. GENERAL CONDITIONS. LocalPulse may disqualify entries or votes that violate these Rules or the Terms of Service, and may cancel or modify a round if fraud or technical failure compromises its integrity, in which case the Sponsor may re-run the round. Decisions of the platform's automated resolution are final. These Rules incorporate the LocalPulse Terms of Service.

10. DISPUTES. [ATTORNEY TO CONFIRM: governing law, venue/arbitration, state-specific sweepstakes registration (e.g., NY, FL) and any prize-value thresholds, and required disclosures.]

11. SPONSOR / ADMINISTRATOR CONTACT. Sponsor: the business named in the contest listing. Administrator: [ASCENSION GROUP LLC / ENTITY NAME], [BUSINESS ADDRESS], [LEGAL CONTACT EMAIL].`;

export const LEGAL_DOCS: Record<LegalDocKey, string> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
  contest: CONTEST_RULES,
};
