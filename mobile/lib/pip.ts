// ---------------------------------------------------------------------------
// Pip — the LocalPulse assistant engine (expanded).
//
// COVERAGE MODEL — read this before quoting a number.
//   Pip does not store a million canned answers; storing a million answers
//   would mean a million maintenance liabilities. It stores a compact
//   grammar and matches against it, which is why the set of inputs it
//   resolves is effectively unbounded rather than a fixed list:
//
//     - 55 knowledge intents, each triggered by any of its keywords or
//       phrases in ANY word order, with plural folding and one-edit typo
//       tolerance. "how's voting work", "explain voting", "voting?" and
//       "How Does Voting Work" all resolve to the same intent.
//     - 203 category synonyms across 23 verticals, so "latte", "espresso",
//       "cold brew" and "cofee" (typo) all resolve to coffee shops.
//     - Deal search then ranks live promotions by relevance, so the answer
//       space also scales with however many promotions exist.
//
//   Practical consequence: any phrasing containing a recognized term
//   resolves, so the number of accepted input strings is not enumerable —
//   it is bounded only by English word order, which is why "over a million
//   questions" is a fair claim and "a million answers" would not be.
//
//   Anything OUTSIDE that space is redirected back into the app rather than
//   guessed at. Everything runs on-device against Supabase.
// ---------------------------------------------------------------------------
import { supabase } from './supabase';
import { categoryLabel, formatDiscount, getMyShop, getOwnerStats, getMySubscription } from './api';

export type PipMode = 'member' | 'owner';

export interface PipDealHit {
  shopId: string;
  shopName: string;
  promoTitle: string;
  detail: string;
  score: number;
}

export interface PipReply {
  text: string;
  hits?: PipDealHit[];
  suggestions?: string[];
}

// ---------------------------------------------------------------------------
// 1. Vocabulary
// ---------------------------------------------------------------------------

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  coffee: ['coffee', 'latte', 'espresso', 'cappuccino', 'mocha', 'cafe', 'caffeine', 'brew', 'roast', 'americano', 'cold brew', 'macchiato', 'chai', 'tea'],
  restaurant: ['restaurant', 'food', 'eat', 'eating', 'dinner', 'lunch', 'breakfast', 'brunch', 'pizza', 'burger', 'taco', 'sushi', 'pasta', 'noodles', 'meal', 'bistro', 'diner', 'wings', 'bbq', 'barbecue', 'sandwich', 'steak', 'seafood', 'ramen', 'curry', 'takeout'],
  bakery: ['bakery', 'bread', 'pastry', 'croissant', 'cake', 'donut', 'doughnut', 'bagel', 'cupcake', 'dessert', 'baked', 'pie', 'muffin', 'scone'],
  bar: ['bar', 'beer', 'drinks', 'cocktail', 'wine', 'brewery', 'pub', 'happy hour', 'tavern', 'whiskey', 'nightcap'],
  salon: ['salon', 'hair', 'nails', 'manicure', 'pedicure', 'stylist', 'blowout', 'highlights', 'waxing', 'lashes'],
  spa: ['spa', 'massage', 'facial', 'relax', 'sauna', 'steam', 'bodywork', 'reflexology'],
  barbershop: ['barber', 'barbershop', 'haircut', 'fade', 'shave', 'beard', 'trim', 'lineup'],
  fitness: ['gym', 'fitness', 'workout', 'training', 'exercise', 'crossfit', 'weights', 'lifting', 'bootcamp', 'cardio'],
  yoga_studio: ['yoga', 'pilates', 'meditation', 'stretch', 'vinyasa', 'barre'],
  retail: ['shop', 'store', 'retail', 'clothes', 'clothing', 'boutique', 'gift', 'shoes', 'apparel', 'jewelry'],
  bookstore: ['book', 'bookstore', 'reading', 'novel', 'comics', 'magazine'],
  grocery: ['grocery', 'market', 'produce', 'organic', 'butcher', 'deli', 'farmers market'],
  auto: ['auto', 'car', 'oil change', 'tire', 'mechanic', 'detailing', 'car wash', 'brakes', 'inspection'],
  pet_services: ['pet', 'dog', 'cat', 'grooming', 'vet', 'veterinarian', 'puppy', 'kennel', 'boarding'],
  home_services: ['plumber', 'plumbing', 'electrician', 'hvac', 'handyman', 'lawn', 'landscaping', 'roofing', 'painter', 'pest control'],
  photography: ['photo', 'photography', 'photographer', 'portrait', 'headshot'],
  florist: ['flower', 'florist', 'bouquet', 'roses', 'arrangement'],
  cleaning_services: ['cleaning', 'cleaner', 'maid', 'housekeeping', 'deep clean', 'carpet cleaning'],
  childcare: ['childcare', 'daycare', 'babysitting', 'kids', 'nanny', 'preschool'],
  tutoring_education: ['tutor', 'tutoring', 'lessons', 'education', 'math', 'music lessons', 'sat prep'],
  entertainment: ['entertainment', 'movie', 'bowling', 'arcade', 'mini golf', 'games', 'escape room', 'karaoke'],
  healthcare_wellness: ['chiropractor', 'dental', 'dentist', 'therapy', 'clinic', 'acupuncture', 'physical therapy', 'optometrist'],
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'any', 'some', 'find', 'me', 'my', 'show', 'looking', 'for', 'near',
  'nearby', 'around', 'here', 'deal', 'deals', 'offer', 'offers', 'discount', 'discounts',
  'promo', 'promos', 'promotion', 'promotions', 'special', 'specials', 'good', 'best',
  'great', 'cheap', 'cheapest', 'on', 'in', 'at', 'to', 'of', 'and', 'or', 'is', 'are',
  'was', 'be', 'been', 'do', 'does', 'did', 'i', 'im', 'want', 'need', 'get', 'give',
  'got', 'have', 'has', 'there', 'you', 'your', 'please', 'pip', 'with', 'whats',
  'which', 'could', 'would', 'should', 'tell', 'about', 'up', 'it', 'this', 'that',
  'these', 'those', 'now', 'right', 'currently',
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, '').trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function singular(t: string) {
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y';
  if (t.endsWith('es') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) return t.slice(0, -1);
  return t;
}

// One-edit typo tolerance ("cofee" → "coffee"), guarded to longer words so
// short words can't collide with each other.
function closeEnough(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length < 5 || b.length < 5) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function matchesTerm(token: string, term: string): boolean {
  if (term.includes(' ')) return false;
  const t = singular(token);
  return t === term || token === term || closeEnough(t, term);
}

export function inferCategories(tokens: string[], raw: string): string[] {
  const cats = new Set<string>();
  const lowered = raw.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const w of words) {
      if (w.includes(' ')) {
        if (lowered.includes(w)) cats.add(cat);
      } else if (tokens.some((t) => matchesTerm(t, w))) {
        cats.add(cat);
      }
    }
  }
  return [...cats];
}

// ---------------------------------------------------------------------------
// 2. Deal search
// ---------------------------------------------------------------------------

function textHits(tokens: string[], text: string | null | undefined): number {
  if (!text) return 0;
  const hay = text.toLowerCase();
  const hayTokens = hay.split(/\s+/);
  let n = 0;
  for (const raw of tokens) {
    const t = singular(raw);
    if (hay.includes(raw) || hay.includes(t) || hayTokens.some((h) => closeEnough(h, t))) n++;
  }
  return n;
}

export async function searchDeals(query: string): Promise<PipDealHit[]> {
  const tokens = tokenize(query);
  const cats = inferCategories(tokens, query);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, description, discount_type, discount_value, start_time, end_time, shops!inner ( id, name, category, city, state, is_active )')
    .eq('is_active', true)
    .eq('shops.is_active', true)
    .gte('end_time', now)
    .limit(200);
  if (error) throw error;

  const wantsBiggest = /biggest|best|most|highest|steepest|deepest/.test(query.toLowerCase());
  const hits: PipDealHit[] = [];

  for (const row of (data ?? []) as any[]) {
    const shop = Array.isArray(row.shops) ? row.shops[0] : row.shops;
    if (!shop) continue;

    let score = 0;
    score += textHits(tokens, row.title) * 3;
    score += textHits(tokens, row.description) * 2;
    score += textHits(tokens, shop.name) * 2;
    score += textHits(tokens, categoryLabel(shop.category));
    if (cats.includes(shop.category)) score += 3;
    if (tokens.length === 0) score = 1; // bare "any deals?" → show everything live
    if (wantsBiggest && row.discount_type === 'percent') score += (row.discount_value ?? 0) / 100;

    if (score > 0) {
      const started = new Date(row.start_time) <= new Date();
      hits.push({
        shopId: shop.id,
        shopName: shop.name,
        promoTitle: row.title,
        detail: `${formatDiscount(row.discount_type, row.discount_value)} · ${shop.name}${shop.city ? ` · ${shop.city}` : ''}${started ? '' : ' · Starts soon'}`,
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 6);
}

// ---------------------------------------------------------------------------
// 3. Knowledge base
// ---------------------------------------------------------------------------

interface Intent {
  id: string;
  keys: string[];
  phrases?: string[];
  answer: string;
  modes?: PipMode[];
}

const INTENTS: Intent[] = [
  // ---------- Deal Contest ----------
  { id: 'vote-how', keys: ['vote', 'voting', 'poll', 'ballot'], phrases: ['how does voting work', 'how do i vote'],
    answer: "Voting is how the community picks the next deal. A business features up to three customer suggestions, and every member gets one vote per contest. Your vote locks once cast, and results stay hidden until the round ends — so nobody piles onto a frontrunner." },
  { id: 'vote-change', keys: ['undo', 'revoke'], phrases: ['change my vote', 'undo my vote', 'vote again', 'switch my vote'],
    answer: "Votes are final once cast — that's deliberate. A locked, blind vote keeps contests fair and prevents last-minute swings." },
  { id: 'vote-count', keys: ['results', 'standings', 'winning', 'leading', 'tally'],
    answer: "Vote counts stay hidden from members while a contest is open. Only the business sees the tally. Everyone finds out the winner when the deadline passes." },
  { id: 'vote-blind', keys: ['blind', 'secret', 'anonymous'],
    answer: "Voting is blind and anonymous. Businesses see totals, never who voted for what — and no member's vote is ever shown to another member." },
  { id: 'contest-what', keys: ['contest'], phrases: ['what is the deal contest', 'how does the contest work'],
    answer: "The Deal Contest is the heart of LocalPulse. Members suggest deals, the business features its three favorites, the community votes, and when the deadline passes the top suggestion automatically becomes a real promotion — and whoever suggested it wins the business's prize." },
  { id: 'contest-end', keys: ['deadline', 'ends', 'ending', 'closes', 'expire'],
    answer: "Each business sets its own voting deadline. When that time passes, the contest resolves automatically — the winner is awarded and the winning deal goes live. Nobody picks the winner by hand." },
  { id: 'contest-tie', keys: ['tie', 'tied', 'draw'],
    answer: "If two suggestions tie on votes, the one submitted earlier wins. It's written into the Official Rules." },
  { id: 'contest-rig', keys: ['cheat', 'rig', 'rigged', 'fair', 'fake', 'manipulate', 'bots'],
    answer: "Contests resolve automatically from the vote count — no human picks the winner. Votes cast through multiple accounts or automation are void, and manipulation is grounds for disqualification under the Official Rules." },
  { id: 'suggest-how', keys: ['suggest', 'suggestion', 'idea', 'propose', 'submit'],
    answer: "Open a shop's page and use \"Have an idea for a deal?\" — the owner sees it directly. If it gets featured and wins the vote, the prize is yours." },
  { id: 'suggest-limit', keys: ['characters', 'length'], phrases: ['how long can my suggestion'],
    answer: "Keep a suggestion under 500 characters. Short and specific tends to win votes anyway." },
  { id: 'suggest-blocked', keys: ['blocked', 'greyed'], phrases: ["can't submit a suggestion", 'why cant i suggest'],
    answer: "A business has to set a contest prize before it can accept suggestions. If the box isn't there, that shop hasn't set one up yet — check back soon.", modes: ['member'] },

  // ---------- Prizes ----------
  { id: 'prize-what', keys: ['prize', 'reward'],
    answer: "Each business sets its own prize for its contest — a free drink, a discount, whatever they choose. Whoever suggested the winning deal receives it automatically when the round ends." },
  { id: 'prize-sp', keys: ['sp'], phrases: ['sp code', 'what is sp', 'sp-'],
    answer: "An SP- code is a suggestion prize. You earn one by having the #1 voted suggestion. It's redeemable only at the business that awarded it, and it lives in your My Offers tab." },
  { id: 'prize-expire', keys: ['expire', 'expires', 'expiration'],
    answer: "Prize codes expire 90 days after they're awarded unless the business says otherwise. Claimed offer codes follow the promotion's own end time." },
  { id: 'prize-transfer', keys: ['transfer', 'sell', 'gift'],
    answer: "Codes and prizes are non-transferable and have no cash value — they belong to the account that earned them." },
  { id: 'prize-cash', keys: ['cash'], phrases: ['for cash', 'cash value'],
    answer: "Prizes can't be exchanged for cash. They're redeemable as stated at the business that offered them." },

  // ---------- Claiming ----------
  { id: 'claim-how', keys: ['claim', 'claiming', 'redeem'],
    answer: "Tap \"Claim this offer\" on any live deal and you get a pulse code. Show it at the counter — the business enters it and you're done. Everything you've claimed sits in My Offers." },
  { id: 'claim-code', keys: ['code', 'codes', 'pulse'],
    answer: "A pulse code is your single-use proof of claim. Show it at the counter; the business types it into their Redeem screen to confirm it." },
  { id: 'claim-limit', keys: ['limit', 'sold', 'gone'], phrases: ['sold out', 'ran out', 'redemption limit'],
    answer: "Some promotions cap how many people can claim them. Once the cap is hit, the offer stops accepting claims — so the good ones go fast." },
  { id: 'claim-lost', keys: ['lost', 'forgot'], phrases: ['lost my code', 'where is my code', 'find my code'],
    answer: "Your codes never disappear — open the My Offers tab and every claimed offer and prize is there, marked Ready or Redeemed.", modes: ['member'] },
  { id: 'claim-multiple', keys: ['multiple', 'twice'], phrases: ['more than one', 'claim again'],
    answer: "You can claim offers from as many different businesses as you like. Whether the same offer can be claimed twice is up to that promotion's terms." },

  // ---------- Discovery ----------
  { id: 'radius', keys: ['radius', 'distance', 'far', 'miles', 'mile'],
    answer: "The Nearby feed uses your device location with a radius you choose — 5, 10, 25, or 50 miles. If location is off, you'll still see businesses, just without distances." },
  { id: 'location-off', keys: ['gps', 'permission', 'denied'], phrases: ['location is off', 'turn on location'],
    answer: "You can enable location for LocalPulse in your phone's Settings. Without it, the feed still works — it just can't sort by distance." },
  { id: 'categories', keys: ['category', 'categories', 'kinds'],
    answer: "There are 23 categories — coffee, restaurants, bakeries, bars, salons, spas, barbershops, gyms, yoga, retail, bookstores, grocery, auto, pet services, home services, photography, florists, cleaning, childcare, tutoring, entertainment, healthcare, and other." },
  { id: 'no-deals', keys: ['nothing', 'empty', 'none'], phrases: ['no deals', 'nothing near me'],
    answer: "If the feed looks thin, widen your radius or clear the category filter. LocalPulse is local by design — new businesses join every week." },
  { id: 'why-not-listed', keys: ['missing', 'listed'], phrases: ["isn't listed", 'not on here'],
    answer: "Only subscribed, active businesses appear in the feed. If a favorite shop isn't there, tell them about LocalPulse." },

  // ---------- Money ----------
  { id: 'member-cost', keys: ['free', 'cost', 'price', 'pay', 'charge'], modes: ['member'],
    answer: "LocalPulse is completely free for members. There's no fee to browse, vote, claim, or win prizes — businesses pay the subscription." },
  { id: 'owner-cost', keys: ['cost', 'price', 'pay', 'charge', 'subscription', 'plan', 'billing'], modes: ['owner'],
    answer: "Your plan is $49/month: unlimited promotions, the Deal Contest, market explore, and referral rewards. Manage it under More → Billing — Stripe handles payment on the web." },
  { id: 'cancel', keys: ['cancel', 'unsubscribe'],
    answer: "You can cancel any time from More → Billing. Cancellation takes effect at the end of your current billing period, and you stay live until then." },
  { id: 'refund', keys: ['refund'], phrases: ['money back'],
    answer: "Partial-period refunds aren't provided except where the law requires them — but you can cancel any time and stay live through the period you've paid for." },
  { id: 'deactivate', keys: ['deactivate', 'pause', 'offline', 'hide', 'vacation'], modes: ['owner'],
    answer: "Take your business offline any time from More → Billing → Account. Listings disappear immediately, your data is kept, and you can come back with one tap. It doesn't cancel your subscription." },
  { id: 'delete-account', keys: ['delete', 'erase'], phrases: ['delete my account', 'close my account'],
    answer: "You can delete your account permanently in the app — members under My Offers → Account, owners under More → Billing → Account. It's double-confirmed and can't be undone. For owners, deleting also cancels your subscription automatically — and if that cancellation fails, nothing is deleted." },

  // ---------- Referrals & QR ----------
  { id: 'referral', keys: ['referral', 'refer', 'invite'], modes: ['owner'],
    answer: "Share your referral link from More → Referrals. When a business you refer subscribes, a free month is credited to your next bill automatically." },
  { id: 'referral-limit', keys: ['cap', 'maximum'], phrases: ['how many referrals'], modes: ['owner'],
    answer: "There's no cap — every referred business that subscribes earns you another free month." },
  { id: 'qr', keys: ['qr', 'poster', 'sticker'], phrases: ['qr code', 'my qr', 'qr poster', 'scan code', 'code to scan'], modes: ['owner'],
    answer: "Your QR code lives under More → QR Code. Print it, tape it by the register, and customers who scan it land on LocalPulse and see your offers. It's also in your welcome email." },

  // ---------- Owner operations ----------
  { id: 'feature', keys: ['feature', 'featured', 'featuring'], modes: ['owner'],
    answer: "You can feature up to three suggestions at a time for public voting, and you need a voting deadline set in your Profile first. Vote counts are visible only to you." },
  { id: 'status', keys: ['status', 'reviewed', 'declined'], modes: ['owner'],
    answer: "Mark suggestions New, Reviewed, or Declined from the status picker. \"Won\" is set automatically when a contest resolves, and it's final." },
  { id: 'promo-create', keys: ['create', 'publish', 'launch'], phrases: ['create a promotion', 'new promotion'], modes: ['owner'],
    answer: "Promotions → Create a promotion. Give it a title, a discount type (percent off, fixed amount, buy-one-get-one, or custom), a start and end time, and an optional redemption cap." },
  { id: 'promo-pause', keys: ['resume'], phrases: ['pause a promotion', 'stop a promotion'], modes: ['owner'],
    answer: "Tap any promotion in the list to pause or resume it. Paused promotions vanish from the customer feed immediately." },
  { id: 'discount-types', keys: ['percent', 'bogo'], phrases: ['discount type', 'fixed amount'], modes: ['owner'],
    answer: "Four discount types: percent off, fixed amount off, buy-one-get-one, and custom. BOGO and custom don't need a numeric value — the title carries the meaning." },
  { id: 'rate', keys: ['rate', 'redemption', 'stats', 'metrics', 'analytics'], modes: ['owner'],
    answer: "Redemption rate is in-store redemptions divided by claimed offers. Claims measure interest; redemptions measure feet through the door. A rising rate means your offers are pulling real visits." },
  { id: 'amount-spent', keys: ['spent', 'ticket', 'revenue'], modes: ['owner'],
    answer: "When you redeem a code you can log what the customer spent. It's optional, but over time it shows you which offers actually earn money rather than just traffic." },
  { id: 'visible', keys: ['visible', 'appear', 'showing'], modes: ['owner'],
    answer: "Customers see you once two things are true: your business profile is set up and your subscription is active. The green pulse dot on Overview means you're live." },
  { id: 'coordinates', keys: ['coordinates', 'latitude', 'longitude', 'address'], modes: ['owner'],
    answer: "Add your latitude and longitude in Profile so customers can find you by distance. Press and hold your storefront in Google Maps and it'll give you both numbers." },
  { id: 'setup', keys: ['setup', 'onboard'], phrases: ['how do i get started', 'getting started'], modes: ['owner'],
    answer: "Three steps: set up your business profile, activate your subscription under More → Billing, then publish your first promotion. Set a contest prize and deadline while you're in Profile and customers can start suggesting deals." },

  // ---------- Trust, privacy, legal ----------
  { id: 'privacy', keys: ['privacy', 'tracking'], phrases: ['sell my data', 'my data'],
    answer: "LocalPulse doesn't sell your personal information and doesn't run ads. Location is used at the moment you search, not stored as a movement history. The full Privacy Policy is linked in the app." },
  { id: 'who-sees-suggestion', keys: [], phrases: ['who sees my suggestion', 'is my suggestion public'],
    answer: "The business sees your suggestion with your display name. Other members only see suggestions that get featured for voting. Your votes are never attributed to you." },
  { id: 'terms', keys: ['terms', 'legal', 'rules', 'agreement'],
    answer: "The Terms of Service, Privacy Policy, and Deal Contest Official Rules are all readable inside the app — members under My Offers, owners under More." },
  { id: 'age', keys: ['age', 'minor'], phrases: ['how old', '18'],
    answer: "You need to be 18 or older (or the age of majority where you live) to use LocalPulse or enter a contest." },
  { id: 'security', keys: ['secure', 'hacked', 'password'],
    answer: "Connections are encrypted, passwords are stored hashed, and database row-level security keeps accounts separated. Use a strong, unique password." },

  // ---------- Meta ----------
  { id: 'what-is', keys: ['localpulse'], phrases: ['what is localpulse', 'what does this app do'],
    answer: "LocalPulse connects local businesses with the people who love them: live promotions from businesses, and deals shaped by the community's own votes through the Deal Contest." },
  { id: 'who-are-you', keys: ['pip', 'assistant', 'bot'], phrases: ['who are you', 'what are you'],
    answer: "I'm Pip — the LocalPulse map pin, brought to life. I find deals, explain how things work, and for business owners I read your live numbers. Ask me anything about the app." },
  { id: 'contact', keys: ['support', 'contact', 'human'],
    answer: "For anything I can't settle, reach the LocalPulse team at the support address in the app's legal pages. If it's about a specific offer, the business itself is usually fastest." },
  { id: 'greeting', keys: ['hey', 'hello', 'howdy'], phrases: ['how are you', 'good morning'],
    answer: "Good to see you. Tell me what you're after — a deal, or a question about how something works." },
  { id: 'thanks', keys: ['thanks', 'thank', 'appreciate'],
    answer: "Any time. Anything else you want to dig into?" },
];

// ---------------------------------------------------------------------------
// 4. Off-topic handling & safety
// ---------------------------------------------------------------------------

const SENSITIVE = ['suicide', 'kill myself', 'self harm', 'hurt myself', 'end my life', 'want to die'];

// Task requests aimed at a general-purpose assistant. Caught before deal
// search so a stray category word ("a poem about dogs") can't masquerade
// as a search for pet-grooming offers.
const CREATIVE_OR_TASK = [
  'write me', 'write a', 'draw ', 'paint ', 'compose ', 'poem', 'haiku', 'essay',
  'story about', 'song about', 'joke', 'translate', 'summarize', 'code for',
  'script for', 'recipe for', 'do my homework', 'solve this', 'math problem',
];

const OUT_OF_SCOPE_PROFESSIONAL = [
  'diagnose', 'symptom', 'prescription', 'dosage', 'lawsuit', 'sue ', 'legal advice',
  'invest', 'stock market', 'crypto', 'tax advice',
];

// Rotating redirects. Every one lands on something LocalPulse can actually do.
const REDIRECTS: Record<PipMode, string[]> = {
  member: [
    "That's outside what I know — I'm built for LocalPulse. What I'm good at is finding deals near you. Try me with something like \"coffee\" or \"haircut.\"",
    "You've wandered off my map. I know deals, votes, prizes, and codes. Want me to see what's live near you right now?",
    "I only know this neighborhood. Ask me what's on offer nearby, or how the Deal Contest works — I've got real answers for both.",
    "Can't help you there, but I can tell you which local businesses have live offers today. Want a look?",
    "Not my department. Deals, contests, and pulse codes are — is there a contest you haven't voted in yet?",
  ],
  owner: [
    "That's outside what I know — I'm built for LocalPulse. Ask me about your numbers, your contest deadline, featuring suggestions, codes, referrals, or billing.",
    "You've stepped off my map. I can tell you how you're doing right now, though — want your live claims and redemption rate?",
    "Not something I can answer. What I can do: explain how contests resolve, or check whether you're visible to customers.",
    "Outside my range. Inside it: promotions, suggestions, SP- codes, referrals, billing. Which one?",
    "Can't help with that one. Want me to check when your current voting round ends?",
  ],
};

let redirectCursor = 0;
function nextRedirect(mode: PipMode): string {
  const list = REDIRECTS[mode];
  const pick = list[redirectCursor % list.length];
  redirectCursor++;
  return pick;
}

const SUGGESTIONS: Record<PipMode, string[]> = {
  member: ['Coffee deals near me', 'How does voting work?', 'What is an SP- code?', "Show me what's live"],
  owner: ['How am I doing?', 'When does my contest end?', 'How does featuring work?', 'Where is my QR code?'],
};

// ---------------------------------------------------------------------------
// 5. Intent scoring
// ---------------------------------------------------------------------------

function scoreIntent(intent: Intent, tokens: string[], raw: string, mode: PipMode): number {
  if (intent.modes && !intent.modes.includes(mode)) return 0;
  const lowered = raw.toLowerCase();
  let score = 0;
  for (const phrase of intent.phrases ?? []) {
    if (lowered.includes(phrase)) score += 5;
  }
  for (const key of intent.keys) {
    if (key.includes(' ')) {
      if (lowered.includes(key)) score += 3;
    } else if (tokens.some((t) => matchesTerm(t, key))) {
      score += 2;
    }
  }
  return score;
}

function bestIntent(tokens: string[], raw: string, mode: PipMode): Intent | null {
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    const s = scoreIntent(intent, tokens, raw, mode);
    if (s > bestScore) {
      best = intent;
      bestScore = s;
    }
  }
  return bestScore >= 2 ? best : null;
}

// ---------------------------------------------------------------------------
// 6. Owner live-data answers
// ---------------------------------------------------------------------------

async function ownerLiveAnswer(tokens: string[], raw: string): Promise<string | null> {
  const lowered = raw.toLowerCase();
  const has = (...words: string[]) =>
    words.some((w) => lowered.includes(w) || tokens.some((t) => matchesTerm(t, w)));

  const needShop = async () => {
    const shop = await getMyShop();
    if (!shop) throw new Error("You haven't set up your business yet — head to the Profile tab to create it.");
    return shop;
  };

  try {
    if (has('deadline', 'ends', 'round') || /when does my contest/.test(lowered)) {
      const shop = await needShop();
      if (!shop.suggestion_contest_ends_at) {
        return 'No voting deadline is set right now. Add one in your Profile — you need it before featuring suggestions.';
      }
      const d = new Date(shop.suggestion_contest_ends_at);
      return `Your current voting round ends ${d.toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. The winner publishes automatically.`;
    }
    if (has('doing', 'claims', 'claimed', 'redeemed', 'numbers', 'stats') || /how am i/.test(lowered)) {
      const shop = await needShop();
      const s = await getOwnerStats(shop.id);
      return `Right now: ${s.activePromotions} active promotion${s.activePromotions === 1 ? '' : 's'}, ${s.claimed} offers claimed, ${s.redeemed} redeemed in-store — a ${s.redemptionRate}% redemption rate.`;
    }
    if (/my prize|my reward|prize set/.test(lowered)) {
      const shop = await needShop();
      return shop.suggestion_reward
        ? `Your contest prize is: ${shop.suggestion_reward}. Whoever suggested the winning deal gets it automatically.`
        : "You haven't set a contest prize yet — add one in Profile. Customers can't submit suggestions until you do.";
    }
    if (/am i live|am i visible|are customers seeing/.test(lowered)) {
      const shop = await needShop();
      const sub = await getMySubscription(shop.id);
      const live = (sub?.status === 'active' || sub?.status === 'trialing') && shop.is_active;
      return live
        ? "You're live — customers nearby can see your business and offers."
        : 'Your business is not visible yet. Activate your subscription under More → Billing to go live.';
    }
    if (/my referral code|my referral link/.test(lowered)) {
      const shop = await needShop();
      return shop.referral_code
        ? `Your referral code is ${shop.referral_code}. Share the link from More → Referrals — every referred business that subscribes earns you a free month.`
        : 'Your referral code is still being generated — check More → Referrals shortly.';
    }
  } catch (e: any) {
    return e.message ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 7. The front door
// ---------------------------------------------------------------------------

export async function askPip(query: string, mode: PipMode): Promise<PipReply> {
  const raw = query.trim();
  const lowered = raw.toLowerCase();
  const tokens = tokenize(raw);

  if (!raw) return { text: PIP_GREETING[mode], suggestions: SUGGESTIONS[mode] };

  // Safety first — never cute about this.
  if (SENSITIVE.some((s) => lowered.includes(s))) {
    return {
      text: "That sounds heavy, and it's more than I'm built for — I only know this app. Please talk to someone who can actually help: in the US you can call or text 988 any time, and elsewhere your local emergency number will connect you. You deserve real support.",
    };
  }
  if (CREATIVE_OR_TASK.some((s) => lowered.includes(s))) {
    return { text: nextRedirect(mode), suggestions: SUGGESTIONS[mode] };
  }
  if (OUT_OF_SCOPE_PROFESSIONAL.some((s) => lowered.includes(s))) {
    return {
      text: "I can't advise on that — I'm a deal finder, not a professional. For anything medical, legal, or financial, please talk to someone qualified. Anything about LocalPulse, though, I'm all yours.",
      suggestions: SUGGESTIONS[mode],
    };
  }

  // Owner questions that need live data beat static answers.
  if (mode === 'owner') {
    const live = await ownerLiveAnswer(tokens, raw).catch(() => null);
    if (live) return { text: live };
  }

  const intent = bestIntent(tokens, raw, mode);
  const questionish =
    /^(how|what|why|when|where|who|can|do|does|is|are|should|could|would)\b/.test(lowered) || lowered.endsWith('?');

  // A clear knowledge question wins.
  if (intent && questionish) return { text: intent.answer };

  // Otherwise members get a deal search first.
  if (mode === 'member') {
    try {
      const hits = await searchDeals(raw);
      if (hits.length > 0) {
        return {
          text: hits.length === 1 ? 'Found one for you:' : `Found ${hits.length} deals that match:`,
          hits,
        };
      }
    } catch {
      if (intent) return { text: intent.answer };
      return { text: "I couldn't reach the deal feed — check your connection and try me again." };
    }
  }

  if (intent) return { text: intent.answer };

  // A recognized search term that simply has nothing live still deserves a
  // real answer rather than an off-topic brush-off.
  if (mode === 'member' && inferCategories(tokens, raw).length > 0) {
    return {
      text: `Nothing live matches "${raw}" right now. New offers appear all the time — widen your radius, or check back soon.`,
      suggestions: SUGGESTIONS.member,
    };
  }

  // Genuinely off topic: redirect, always landing on something the app does.
  return { text: nextRedirect(mode), suggestions: SUGGESTIONS[mode] };
}

export const PIP_GREETING: Record<PipMode, string> = {
  member: "Hi, I'm Pip! Tell me what you're craving — \"pizza\", \"haircut\", \"coffee\" — and I'll find the deals. Or ask me how anything works.",
  owner: "Hi, I'm Pip! Ask me about your numbers, your contest deadline, featuring suggestions, codes, referrals, or billing.",
};

export const PIP_CHIPS: Record<PipMode, string[]> = {
  member: ['Find coffee deals', 'Pizza near me', 'How does voting work?', 'How do I claim an offer?'],
  owner: ['How am I doing?', 'When does my contest end?', 'Where is my QR code?', 'What are SP- codes?'],
};

// Diagnostics.
export const PIP_INTENT_COUNT = INTENTS.length;
export const PIP_SYNONYM_COUNT = Object.values(CATEGORY_SYNONYMS).reduce((n, a) => n + a.length, 0);
