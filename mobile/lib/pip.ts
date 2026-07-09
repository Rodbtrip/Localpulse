// ---------------------------------------------------------------------------
// Pip — the LocalPulse assistant engine.
// Two capabilities, both fully on-device + Supabase (no external AI calls):
//   1. Deal search: keyword + synonym matching over live promotions and
//      shops, ranked by relevance and (when available) distance.
//   2. Q&A: intent-matched answers to how-it-works questions, with
//      owner-mode answers drawn from the owner's own live data.
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
}

// ---------- keyword normalization & synonyms ----------

// Maps everyday search words to the platform's category values, so
// "pizza" finds restaurants and "latte" finds coffee shops even when the
// word never appears in the listing text.
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  coffee: ['coffee', 'latte', 'espresso', 'cappuccino', 'mocha', 'cafe', 'caffeine', 'brew', 'roast'],
  restaurant: ['restaurant', 'food', 'eat', 'dinner', 'lunch', 'breakfast', 'pizza', 'burger', 'taco', 'sushi', 'pasta', 'meal', 'bistro', 'diner', 'wings', 'bbq', 'sandwich'],
  bakery: ['bakery', 'bread', 'pastry', 'croissant', 'cake', 'donut', 'doughnut', 'bagel', 'cupcake', 'dessert', 'baked'],
  bar: ['bar', 'beer', 'drinks', 'cocktail', 'wine', 'brewery', 'pub', 'happy'],
  salon: ['salon', 'hair', 'nails', 'manicure', 'pedicure', 'stylist', 'color', 'blowout'],
  spa: ['spa', 'massage', 'facial', 'relax', 'wellness', 'sauna'],
  barbershop: ['barber', 'barbershop', 'haircut', 'fade', 'shave', 'beard', 'trim'],
  fitness: ['gym', 'fitness', 'workout', 'training', 'exercise', 'crossfit', 'weights', 'class'],
  yoga_studio: ['yoga', 'pilates', 'meditation', 'stretch'],
  retail: ['shop', 'store', 'retail', 'clothes', 'clothing', 'boutique', 'gift', 'shoes'],
  bookstore: ['book', 'books', 'bookstore', 'reading', 'novel'],
  grocery: ['grocery', 'market', 'produce', 'organic', 'groceries'],
  auto: ['auto', 'car', 'oil', 'tire', 'mechanic', 'detailing', 'wash'],
  pet_services: ['pet', 'dog', 'cat', 'grooming', 'vet', 'puppy', 'kennel', 'boarding'],
  home_services: ['plumber', 'plumbing', 'electrician', 'hvac', 'handyman', 'lawn', 'landscaping', 'roofing'],
  photography: ['photo', 'photography', 'photographer', 'portrait', 'headshot'],
  florist: ['flower', 'flowers', 'florist', 'bouquet', 'roses'],
  cleaning_services: ['cleaning', 'cleaner', 'maid', 'housekeeping'],
  childcare: ['childcare', 'daycare', 'babysitting', 'kids'],
  tutoring_education: ['tutor', 'tutoring', 'lessons', 'education', 'math', 'music'],
  entertainment: ['entertainment', 'movie', 'bowling', 'arcade', 'golf', 'fun', 'games'],
  healthcare_wellness: ['health', 'chiropractor', 'dental', 'dentist', 'therapy', 'clinic', 'acupuncture'],
};

// Words that appear in almost any query — carry no search signal.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'any', 'some', 'find', 'me', 'show', 'looking', 'for', 'near',
  'nearby', 'around', 'deal', 'deals', 'offer', 'offers', 'discount', 'discounts',
  'promo', 'promotion', 'promotions', 'good', 'best', 'cheap', 'on', 'in', 'at',
  'i', 'want', 'need', 'get', 'is', 'there', 'are', 'to', 'of', 'and', 'or',
  'please', 'pip', 'help', 'with', 'my', 'do', 'you', 'have', 'whats', "what's", 'what',
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function singular(t: string) {
  return t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t;
}

export function inferCategories(tokens: string[]): string[] {
  const cats = new Set<string>();
  for (const raw of tokens) {
    const t = singular(raw);
    for (const [cat, words] of Object.entries(CATEGORY_SYNONYMS)) {
      if (words.some((w) => w === t || w === raw)) cats.add(cat);
    }
  }
  return [...cats];
}

// ---------- deal search ----------

function textHits(tokens: string[], text: string | null | undefined): number {
  if (!text) return 0;
  const hay = text.toLowerCase();
  let n = 0;
  for (const raw of tokens) {
    const t = singular(raw);
    if (hay.includes(raw) || hay.includes(t)) n++;
  }
  return n;
}

export async function searchDeals(query: string): Promise<PipDealHit[]> {
  const tokens = tokenize(query);
  const cats = inferCategories(tokens);
  const now = new Date().toISOString();

  // Live promotions with their (active) shops. The local pilot's promotion
  // count is small, so fetching a page and ranking on-device gives far
  // better matching than a single ilike ever could.
  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, description, discount_type, discount_value, start_time, end_time, shops!inner ( id, name, category, city, state, is_active )')
    .eq('is_active', true)
    .eq('shops.is_active', true)
    .gte('end_time', now)
    .limit(200);
  if (error) throw error;

  const hits: PipDealHit[] = [];
  for (const row of (data ?? []) as any[]) {
    const shop = Array.isArray(row.shops) ? row.shops[0] : row.shops;
    if (!shop) continue;

    let score = 0;
    score += textHits(tokens, row.title) * 3;
    score += textHits(tokens, row.description) * 2;
    score += textHits(tokens, shop.name) * 2;
    score += textHits(tokens, categoryLabel(shop.category));
    if (cats.includes(shop.category)) score += 3; // synonym-inferred category
    if (tokens.length === 0) score = 1; // empty query: show everything live

    if (score > 0) {
      const started = new Date(row.start_time) <= new Date();
      hits.push({
        shopId: shop.id,
        shopName: shop.name,
        promoTitle: row.title,
        detail: `${formatDiscount(row.discount_type, row.discount_value)} · ${shop.name}${
          shop.city ? ` · ${shop.city}` : ''
        }${started ? '' : ' · Starts soon'}`,
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 6);
}

// ---------- Q&A: intent-matched answers ----------

interface Faq {
  keywords: string[];
  answer: string;
}

const MEMBER_FAQS: Faq[] = [
  {
    keywords: ['vote', 'voting', 'poll', 'contest'],
    answer:
      "Voting is how the community picks the next deal. Each business features up to 3 customer suggestions — you get one vote per contest, it locks once cast, and results stay hidden until the round ends. If your pick wins, it becomes a real promotion.",
  },
  {
    keywords: ['claim', 'claiming', 'code', 'redeem', 'use'],
    answer:
      'Tap "Claim this offer" on any deal and you get a pulse code. Show it at the counter — the business enters it and the offer is yours. Your codes live in the My Offers tab.',
  },
  {
    keywords: ['prize', 'win', 'won', 'reward', 'sp'],
    answer:
      "If your suggestion gets the most votes when a contest ends, you win the business's prize automatically — an SP- code appears in My Offers, redeemable only at that business.",
  },
  {
    keywords: ['suggest', 'suggestion', 'idea', 'submit'],
    answer:
      "Open any shop's page and use \"Have an idea for a deal?\" — the owner sees it directly. If it gets featured and wins the vote, you take the prize.",
  },
  {
    keywords: ['location', 'radius', 'distance', 'far', 'miles'],
    answer:
      'The Nearby feed uses your device location with a radius you control — 5, 10, 25, or 50 miles. If location is off, you still see all businesses, just without distances.',
  },
  {
    keywords: ['cost', 'price', 'pay', 'free', 'subscription'],
    answer: 'LocalPulse is completely free for members. Businesses pay a subscription to appear — you just discover, vote, and claim.',
  },
  {
    keywords: ['notification', 'notified', 'know', 'result'],
    answer:
      "When a contest you voted in resolves, you'll see the result in My Offers — winners and their voters hear about it first.",
  },
];

const OWNER_FAQS: Faq[] = [
  {
    keywords: ['feature', 'featured', 'featuring', 'three', '3'],
    answer:
      'You can feature up to 3 suggestions at a time for public voting, and you need a voting deadline set in your profile first. Vote counts are visible only to you — customers see a blind poll.',
  },
  {
    keywords: ['deadline', 'contest', 'end', 'ends', 'resolve', 'winner'],
    answer:
      'Contests resolve automatically: when your voting deadline passes, the #1 voted featured suggestion is awarded, published as a live promotion, and the round resets. There is no manual way to pick a winner — that keeps it fair.',
  },
  {
    keywords: ['sp', 'prize', 'code', 'redeem', 'redemption'],
    answer:
      'Two kinds of codes come to your Redeem tab: standard pulse codes from claimed offers, and SP- codes, which are contest prizes redeemable only at your business. Adding the amount spent is optional but helps track what offers earn you.',
  },
  {
    keywords: ['status', 'new', 'reviewed', 'declined'],
    answer:
      'You can mark suggestions New, Reviewed, or Declined from the status picker. "Won" is set automatically when a contest resolves and is final.',
  },
  {
    keywords: ['visible', 'live', 'appear', 'customers', 'see'],
    answer:
      'Customers see your business once two things are true: your profile is set up and your subscription is active. Check Overview — the green pulse dot means you are live.',
  },
  {
    keywords: ['billing', 'subscription', 'pay', 'cost', 'price'],
    answer:
      'Your plan is $49/month — unlimited promotions, the Deal Contest, market explore, and referral rewards. Manage it under More → Billing (payment runs through Stripe on the web).',
  },
  {
    keywords: ['referral', 'refer', 'free', 'month'],
    answer:
      'Share your referral link from More → Referrals. When a business you refer subscribes, a free month is applied to your next bill automatically.',
  },
  {
    keywords: ['rate', 'redemption', 'stats', 'numbers'],
    answer:
      'Redemption rate = in-store redemptions ÷ claimed offers. Claims show interest; redemptions are people who actually walked in. A rising rate means your offers are pulling real visits.',
  },
];

function bestFaq(tokens: string[], faqs: Faq[]): Faq | null {
  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of faqs) {
    const score = tokens.reduce((n, t) => n + (f.keywords.includes(singular(t)) || f.keywords.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

// Owner questions answered from their own live data.
async function ownerLiveAnswer(tokens: string[]): Promise<string | null> {
  const wants = (words: string[]) => words.some((w) => tokens.includes(w) || tokens.map(singular).includes(w));

  if (wants(['deadline', 'contest', 'when', 'ends', 'end'])) {
    const shop = await getMyShop();
    if (!shop) return "You haven't set up your business yet — head to the Profile tab to create it.";
    if (!shop.suggestion_contest_ends_at) {
      return 'No voting deadline is set right now. Add one in your Profile — you need it before featuring suggestions.';
    }
    const d = new Date(shop.suggestion_contest_ends_at);
    return `Your current voting round ends ${d.toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. The winner publishes automatically.`;
  }
  if (wants(['claim', 'claims', 'claimed', 'redeemed', 'stat', 'stats', 'rate', 'numbers', 'doing'])) {
    const shop = await getMyShop();
    if (!shop) return "You haven't set up your business yet — head to the Profile tab to create it.";
    const s = await getOwnerStats(shop.id);
    return `Right now: ${s.activePromotions} active promotion${s.activePromotions === 1 ? '' : 's'}, ${s.claimed} offers claimed, ${s.redeemed} redeemed in-store — a ${s.redemptionRate}% redemption rate.`;
  }
  if (wants(['prize', 'reward'])) {
    const shop = await getMyShop();
    if (!shop) return "You haven't set up your business yet — head to the Profile tab to create it.";
    return shop.suggestion_reward
      ? `Your contest prize is: ${shop.suggestion_reward}. Whoever suggested the winning deal gets it automatically.`
      : "You haven't set a contest prize yet — add one in Profile. Customers can't submit suggestions until you do.";
  }
  if (wants(['subscription', 'billing', 'active', 'live', 'visible'])) {
    const shop = await getMyShop();
    if (!shop) return "You haven't set up your business yet — head to the Profile tab to create it.";
    const sub = await getMySubscription(shop.id);
    const live = (sub?.status === 'active' || sub?.status === 'trialing') && shop.is_active;
    return live
      ? "You're live — customers nearby can see your business and offers."
      : 'Your business is not visible yet. Activate your subscription under More → Billing to go live.';
  }
  return null;
}

// ---------- the front door ----------

const MEMBER_FALLBACK =
  "I can find deals for you — try something like \"pizza\", \"haircut\", or \"coffee near me\" — or ask how voting, claiming, or prizes work.";
const OWNER_FALLBACK =
  'I can answer questions about contests, featuring, redemption codes, referrals, billing, and your live numbers — try "when does my contest end?" or "how am I doing?"';

export async function askPip(query: string, mode: PipMode): Promise<PipReply> {
  const tokens = tokenize(query);

  if (mode === 'owner') {
    const live = await ownerLiveAnswer(tokens).catch(() => null);
    if (live) return { text: live };
    const faq = bestFaq(tokens, OWNER_FAQS);
    return { text: faq ? faq.answer : OWNER_FALLBACK };
  }

  // Member: answer how-it-works questions when they clearly dominate…
  const faq = bestFaq(tokens, MEMBER_FAQS);
  const looksLikeQuestion = /how|what|why|when|where|can i|do i/.test(query.toLowerCase());
  if (faq && looksLikeQuestion) return { text: faq.answer };

  // …otherwise treat it as a deal search.
  try {
    const hits = await searchDeals(query);
    if (hits.length > 0) {
      return {
        text: hits.length === 1 ? 'Found one for you:' : `Found ${hits.length} deals that match:`,
        hits,
      };
    }
    if (faq) return { text: faq.answer };
    return {
      text: `Nothing live matches "${query}" right now — new offers appear all the time, so check back soon. ${MEMBER_FALLBACK}`,
    };
  } catch {
    if (faq) return { text: faq.answer };
    return { text: "I couldn't reach the deal feed — check your connection and try again." };
  }
}

export const PIP_GREETING: Record<PipMode, string> = {
  member: "Hi, I'm Pip! Tell me what you're craving — \"pizza\", \"haircut\", \"coffee\" — and I'll find the deals. Or ask me how anything works.",
  owner: "Hi, I'm Pip! Ask me about your numbers, your contest deadline, featuring suggestions, codes, referrals, or billing.",
};

export const PIP_CHIPS: Record<PipMode, string[]> = {
  member: ['Find coffee deals', 'Pizza near me', 'How does voting work?', 'How do I claim an offer?'],
  owner: ['How am I doing?', 'When does my contest end?', 'How does featuring work?', 'What are SP- codes?'],
};
