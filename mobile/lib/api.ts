// ---------------------------------------------------------------------------
// LocalPulse mobile — data layer.
// Verified line-by-line against the platform code (LocalPulse_Owner_Dashboard).
// Identity contract: role and full name live in the `profiles` table — the
// same source of truth the web platform uses. Auth metadata is only a hint.
// ---------------------------------------------------------------------------
import { supabase } from './supabase';

export type Role = 'owner' | 'customer';

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  suggestion_reward: string | null;
  suggestion_contest_ends_at: string | null;
  referral_code: string | null;
  is_active: boolean;
  logo_url: string | null;
}

export interface Promotion {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  start_time: string;
  end_time: string;
  max_redemptions: number | null;
  is_active: boolean;
}

export interface DealSuggestion {
  id: string;
  suggestion: string;
  status: string;
  featured: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
  // No vote_count here on purpose: shop owners are blind to vote tallies
  // while a contest is live, same as customers (see migration
  // backend/migration-owner-vote-blindness.sql). Final results are only
  // visible after resolve_expired_suggestion_contests() marks a winner
  // (status becomes WON_STATUS) and publishes the promotion.
}

export interface TopSuggestion {
  id: string;
  suggestion: string;
  is_my_vote: boolean;
  already_voted_this_contest: boolean;
}

export interface NearbyShop {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  distance_meters: number | null;
  active_promotion_count: number | null;
}

// Mirrors lib/categories.ts / the shops_category_check constraint.
export const CATEGORIES = [
  { value: 'coffee', label: 'Coffee shop' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'bar', label: 'Bar' },
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'fitness', label: 'Gym / fitness studio' },
  { value: 'yoga_studio', label: 'Yoga studio' },
  { value: 'retail', label: 'Retail' },
  { value: 'bookstore', label: 'Bookstore' },
  { value: 'grocery', label: 'Grocery / market' },
  { value: 'auto', label: 'Auto services' },
  { value: 'pet_services', label: 'Pet services' },
  { value: 'home_services', label: 'Home services' },
  { value: 'photography', label: 'Photography' },
  { value: 'florist', label: 'Florist' },
  { value: 'cleaning_services', label: 'Cleaning services' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'tutoring_education', label: 'Tutoring / education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'healthcare_wellness', label: 'Healthcare / wellness' },
  { value: 'other', label: 'Other' },
] as const;

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Mirrors the web promotion form and formatDiscount().
export const DISCOUNT_TYPES = [
  { value: 'percent', label: 'Percent off', needsValue: true },
  { value: 'fixed', label: 'Fixed amount off', needsValue: true },
  { value: 'bogo', label: 'Buy one, get one', needsValue: false },
  { value: 'custom', label: 'Custom', needsValue: false },
] as const;

export function formatDiscount(type: string, value: number | null) {
  if (type === 'percent') return `${value}% off`;
  if (type === 'fixed') return `$${value} off`;
  if (type === 'bogo') return 'Buy one, get one';
  return 'Custom offer';
}

// ---------- Auth & identity ----------

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Mirrors the web sign-up actions: creates the auth user AND the profiles
// row (role's source of truth), stores full name, and parks any referral
// code in pending_referral_code so shop creation can resolve it later —
// exactly like upsertShop() on the web.
export async function signUp(opts: {
  email: string;
  password: string;
  role: Role;
  fullName: string;
  referralCode?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: { data: { full_name: opts.fullName, role: opts.role } },
  });
  if (error) throw error;

  if (data.user) {
    const profile: Record<string, unknown> = {
      id: data.user.id,
      full_name: opts.fullName,
      role: opts.role,
    };
    if (opts.role === 'owner') {
      profile.pending_referral_code = opts.referralCode?.trim().toUpperCase() || null;
    }
    const { error: profileError } = await supabase.from('profiles').upsert(profile);
    // If email confirmation is on there may be no session yet, so this
    // insert can be blocked by RLS — the retry in ensureProfile() (called
    // on first authenticated launch) covers that case.
    if (profileError && data.session) throw profileError;
  }
  return data; // data.session is null when email confirmation is required
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Role comes from profiles (same source of truth as the web platform's
// sign-in redirect and middleware). Metadata is only a fallback for the
// window before the profiles row exists.
export async function getMyRole(): Promise<Role> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'customer';
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profile?.role === 'owner' || profile?.role === 'customer') return profile.role;
  const metaRole = auth.user.user_metadata?.role;
  return metaRole === 'owner' ? 'owner' : 'customer';
}

// Heals accounts whose profiles row is missing (e.g. mobile sign-up with
// email confirmation on, where the pre-session upsert was blocked).
export async function ensureProfile(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (existing) return;
  const meta = auth.user.user_metadata ?? {};
  await supabase.from('profiles').upsert({
    id: auth.user.id,
    full_name: meta.full_name ?? '',
    role: meta.role === 'owner' ? 'owner' : 'customer',
  });
}

// ---------- Owner: shop ----------

export async function getMyShop(): Promise<Shop | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Mirrors web upsertShop(): insert on first save (resolving any referral
// code parked at sign-up), update thereafter.
export async function upsertShop(shopId: string | null, payload: Partial<Shop>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('You must be signed in.');

  const full: Record<string, unknown> = { ...payload, owner_id: auth.user.id };

  if (!shopId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('pending_referral_code')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (profile?.pending_referral_code) {
      const { data: referringShop } = await supabase
        .from('shops')
        .select('id')
        .eq('referral_code', profile.pending_referral_code)
        .maybeSingle();
      if (referringShop) full.referred_by_shop_id = referringShop.id;
      await supabase.from('profiles').update({ pending_referral_code: null }).eq('id', auth.user.id);
    }
  }

  const { error } = shopId
    ? await supabase.from('shops').update(full).eq('id', shopId).eq('owner_id', auth.user.id)
    : await supabase.from('shops').insert(full);
  if (error) throw error;
}

// ---------- Owner: overview stats (mirrors app/dashboard/page.tsx) ----------

export async function getOwnerStats(shopId: string) {
  const [{ count: active }, { count: claimed }, { count: redeemed }] = await Promise.all([
    supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true),
    supabase
      .from('claimed_offers')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId),
    // Same table the web dashboard counts — keeps both surfaces in agreement.
    supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId),
  ]);
  const c = claimed ?? 0;
  const r = redeemed ?? 0;
  return {
    activePromotions: active ?? 0,
    claimed: c,
    redeemed: r,
    redemptionRate: c > 0 ? Math.round((r / c) * 100) : 0,
  };
}

export async function getMySubscription(shopId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('shop_id', shopId)
    .maybeSingle();
  return data;
}

// ---------- Promotions ----------

export async function listPromotions(shopId: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPromotion(p: {
  shop_id: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: number | null;
  start_time: string;
  end_time: string;
  max_redemptions: number | null;
}) {
  const { error } = await supabase.from('promotions').insert({ ...p, is_active: true });
  if (error) throw error;
}

export async function setPromotionActive(id: string, isActive: boolean) {
  const { error } = await supabase.from('promotions').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// ---------- Deal Contest (owner side) ----------

const MAX_FEATURED = 3;

// "implemented" is the automatic-win status set by finalize_suggestion_win()
// in the database — final, never manually assignable (mirrors the web).
export const WON_STATUS = 'implemented';
export const OWNER_STATUSES = ['new', 'reviewed', 'declined'] as const;

export async function listSuggestions(shopId: string): Promise<DealSuggestion[]> {
  // Intentionally does not select suggestion_votes(count) — the owner
  // RLS policy that used to allow this was removed so owners stay blind
  // to vote tallies until the contest resolves, same as customers.
  const { data, error } = await supabase
    .from('deal_suggestions')
    .select('id, suggestion, status, featured, created_at, profiles ( full_name )')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    ...s,
    profiles: Array.isArray(s.profiles) ? s.profiles[0] ?? null : s.profiles,
  }));
}

export async function toggleFeatured(shopId: string, id: string, featured: boolean) {
  if (featured) {
    const { count } = await supabase
      .from('deal_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('featured', true);
    if ((count ?? 0) >= MAX_FEATURED) {
      throw new Error(`You already have ${MAX_FEATURED} featured suggestions — unfeature one first.`);
    }
  }
  const { error } = await supabase.from('deal_suggestions').update({ featured }).eq('id', id);
  if (error) throw error;
}

export async function setSuggestionStatus(id: string, status: (typeof OWNER_STATUSES)[number]) {
  const { error } = await supabase.from('deal_suggestions').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---------- Deal Contest (customer side, blind poll) ----------

export async function getTopSuggestions(shopId: string): Promise<TopSuggestion[]> {
  const { data, error } = await supabase.rpc('get_top_suggestions', {
    p_shop_id: shopId,
    p_limit: 3,
  });
  if (error) throw error;
  return data ?? [];
}

export async function castVote(suggestionId: string) {
  const { error } = await supabase.rpc('cast_vote', { p_suggestion_id: suggestionId });
  if (error) throw error;
}

export const SUGGESTION_MAX_LENGTH = 500;

// Mirrors web submitSuggestion(): friendly prize pre-check (the RLS policy
// from migration-require-prize.sql is the real enforcement), 500-char cap,
// and no explicit status/featured — the database defaults own those.
export async function submitSuggestion(shopId: string, suggestion: string) {
  const trimmed = suggestion.trim();
  if (!trimmed) throw new Error('Enter your idea before submitting.');
  if (trimmed.length > SUGGESTION_MAX_LENGTH) {
    throw new Error(`Keep suggestions under ${SUGGESTION_MAX_LENGTH} characters.`);
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to suggest a deal.');

  const { data: shop } = await supabase
    .from('shops')
    .select('suggestion_reward')
    .eq('id', shopId)
    .maybeSingle();
  if (!shop?.suggestion_reward || !shop.suggestion_reward.trim()) {
    throw new Error("This business hasn't set up a suggestion reward yet.");
  }

  const { error } = await supabase.from('deal_suggestions').insert({
    shop_id: shopId,
    customer_id: auth.user.id,
    suggestion: trimmed,
  });
  if (error) throw error;
}

// ---------- Customer: explore ----------

export async function listNearbyShops(opts: {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  category: string | null;
}): Promise<{ shops: NearbyShop[]; usedLocation: boolean }> {
  if (opts.lat != null && opts.lng != null) {
    const { data, error } = await supabase.rpc('nearby_shops', {
      p_lat: opts.lat,
      p_lng: opts.lng,
      p_radius_meters: opts.radiusMeters,
      p_category: opts.category,
    });
    if (error) throw error;
    return { shops: data ?? [], usedLocation: true };
  }
  // Location unavailable: plain listing of active shops (no distance,
  // no counts — the UI labels this state honestly instead of pretending).
  let q = supabase
    .from('shops')
    .select('id, name, description, category, address, city, state, logo_url')
    .eq('is_active', true);
  if (opts.category) q = q.eq('category', opts.category);
  const { data, error } = await q.limit(50);
  if (error) throw error;
  return {
    shops: (data ?? []).map((s: any) => ({ ...s, distance_meters: null, active_promotion_count: null })),
    usedLocation: false,
  };
}

// Includes upcoming promotions (active, not yet ended) so the shop page
// matches the "N active offers" count in the feed — upcoming ones render
// as "Starts …" with claiming disabled.
export async function getShopWithPromotions(shopId: string) {
  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  const now = new Date().toISOString();
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .gte('end_time', now)
    .order('start_time', { ascending: true });
  return { shop: shop as Shop, promotions: (promotions ?? []) as Promotion[] };
}

// ---------- Claims ----------

export async function claimPromotion(promotionId: string) {
  const { data, error } = await supabase.rpc('claim_offer', { p_promotion_id: promotionId });
  if (error) throw error; // SQL raises human-readable messages
  return data?.[0] ?? null;
}

export async function getMyClaimedOffers() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('claimed_offers')
    .select('id, code, status, claimed_at, redeemed_at, promotions ( title, description ), shops ( name, address, city )')
    .eq('customer_id', auth.user.id)
    .order('claimed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Mirrors lib/actions/claim.ts getMySuggestionPrizes() exactly.
export async function getMySuggestionPrizes() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('suggestion_prizes')
    .select('id, code, prize_description, status, created_at, shops ( name )')
    .eq('customer_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- Redemption (owner side) ----------

export async function redeemCode(rawCode: string, amountSpent?: number) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error('Enter a redemption code.');

  if (code.startsWith('SP-')) {
    const { data, error } = await supabase.rpc('redeem_suggestion_prize', { p_code: code });
    if (error) throw error;
    return { success: true, prizeDescription: data?.[0]?.prize_description as string | undefined };
  }

  const { data, error } = await supabase.functions.invoke('redeem-offer', {
    body: { code, amountSpent },
  });

  if (error) {
    // FunctionsHttpError carries the response in error.context; pull the
    // function's real message out of it when possible.
    let message = 'Redemption failed — check the code and try again.';
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* body unreadable — keep the fallback */
      }
    } else if ((error as any).message?.includes('Failed to fetch')) {
      message = 'No connection — check your internet and try again.';
    }
    throw new Error(message);
  }

  // A 200 response can still carry a business-logic failure.
  if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return { success: true, ...(data ?? {}) };
}

// ---------- Referrals ----------

export async function getReferralData(shopId: string, referralCode: string) {
  const { data: referredShops, error: e1 } = await supabase
    .from('shops')
    .select('id, name, created_at')
    .eq('referred_by_shop_id', shopId);
  if (e1) throw e1;
  const { data: credits, error: e2 } = await supabase
    .from('referral_credits')
    .select('id, referred_shop_id, amount_credited, created_at')
    .eq('referring_shop_id', shopId)
    .order('created_at', { ascending: false });
  if (e2) throw e2;
  const converted = new Set((credits ?? []).map((c: any) => c.referred_shop_id));
  return {
    code: referralCode,
    link: `https://localpulse.app/sign-up?ref=${referralCode}`,
    referred: (referredShops ?? []).map((s: any) => ({ ...s, converted: converted.has(s.id) })),
    freeMonthsEarned: (credits ?? []).length,
  };
}

// ---------- Notifications ----------

export async function getUnreadNotifications() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, message, created_at')
    .eq('customer_id', auth.user.id)
    .eq('read', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('notifications').update({ read: true }).in('id', ids);
}


// ---------- Account deactivation & deletion ----------

// Owner: take the business offline (listings disappear immediately).
// Fully reversible from the same place.
export async function setBusinessActive(shopId: string, active: boolean) {
  const { error } = await supabase.from('shops').update({ is_active: active }).eq('id', shopId);
  if (error) throw error;
}

// Permanent, irreversible account deletion via the delete-account Edge
// Function (server-side, service-role — the only safe way to remove an
// auth user). Signs the user out afterward.
export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) {
    let message =
      'Account deletion is temporarily unavailable. Please try again later, or email [SUPPORT EMAIL] and we will delete your account for you.';
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {}
    }
    throw new Error(message);
  }
  if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  await supabase.auth.signOut();
}


// ---------- QR / scan link ----------

// The public landing page a printed QR code points at. It resolves to the
// shop's offers, and forwards to the App Store / Play Store if the visitor
// doesn't have the app yet.
export const SCAN_BASE_URL = 'https://localpulse.app/s';

export function shopScanUrl(shopId: string) {
  return `${SCAN_BASE_URL}/${shopId}`;
}

// ---------- Welcome email ----------

// Fired once, right after an owner's account exists. The Edge Function
// builds the email (including an <img> pointing at the qr-code function)
// and hands it to the email provider. Safe to call more than once — the
// function is idempotent per shop.
export async function sendWelcomeEmail() {
  const { data, error } = await supabase.functions.invoke('send-welcome-email', { body: {} });
  if (error) throw error;
  return data;
}
