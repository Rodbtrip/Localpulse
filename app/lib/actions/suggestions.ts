"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitSuggestion(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const shopId = String(formData.get("shopId") ?? "");
  const suggestion = String(formData.get("suggestion") ?? "").trim();

  if (!suggestion) {
    return { error: "Enter your idea before submitting." };
  }
  if (suggestion.length > 500) {
    return { error: "Keep suggestions under 500 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to suggest a deal." };
  }

  // Friendly pre-check — the real enforcement is the RLS insert policy
  // added in migration-require-prize.sql, which blocks this insert at
  // the database level regardless of what this check does. This just
  // turns a generic RLS rejection into a clear, specific message.
  const { data: shop } = await supabase
    .from("shops")
    .select("suggestion_reward")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop?.suggestion_reward || !shop.suggestion_reward.trim()) {
    return { error: "This business hasn't set up a suggestion reward yet." };
  }

  const { error } = await supabase.from("deal_suggestions").insert({
    shop_id: shopId,
    customer_id: user.id,
    suggestion,
  });

  if (error) return { error: error.message };

  revalidatePath(`/browse/${shopId}`);
  return { success: true };
}

// Used in the owner dashboard
export async function getShopSuggestions(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deal_suggestions")
    .select(
      "id, suggestion, status, featured, created_at, profiles ( full_name ), suggestion_votes ( count )"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Lets an owner curate which suggestions go up for public customer
// voting — max 3, enforced both here (for a clear error message) and
// at the database level via a trigger (the real guarantee).
export async function toggleFeatured(suggestionId: string, shopId: string, featured: boolean) {
  const supabase = await createClient();

  if (featured) {
    const { count } = await supabase
      .from("deal_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("featured", true);

    if ((count ?? 0) >= 3) {
      return { error: "You already have 3 featured suggestions — unfeature one first." };
    }
  }

  const { error } = await supabase
    .from("deal_suggestions")
    .update({ featured })
    .eq("id", suggestionId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/suggestions");
  return { success: true };
}

export async function updateSuggestionStatus(suggestionId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("deal_suggestions")
    .update({ status })
    .eq("id", suggestionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/suggestions");
}

export type TopSuggestion = {
  id: string;
  suggestion: string;
  is_my_vote: boolean;
  already_voted_this_contest: boolean;
};

// Used on the customer shop page — calls the security-definer
// get_top_suggestions() function. Returns NO vote counts and is
// ordered by submission time, not votes — this is a blind poll, and
// results are never exposed to customers before the contest resolves.
export async function getTopSuggestions(shopId: string): Promise<TopSuggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_top_suggestions", {
    p_shop_id: shopId,
    p_limit: 3,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Casts a vote — insert-only, cannot be changed or undone once cast
// for the current contest round (enforced at the database level).
export async function castVote(suggestionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sign in to vote." };

  const { error } = await supabase.rpc("cast_vote", {
    p_suggestion_id: suggestionId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/browse`);
  return { success: true };
}
