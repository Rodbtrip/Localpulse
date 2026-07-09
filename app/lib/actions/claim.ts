"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Calls claim_offer() from rpc-functions.sql — this is the atomic,
// race-condition-safe claim function, not a direct table insert.
export async function claimPromotion(promotionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to claim this offer." };
  }

  const { data, error } = await supabase.rpc("claim_offer", {
    p_promotion_id: promotionId,
  });

  if (error) {
    // These are the human-readable messages raised inside the SQL
    // function (e.g. "This offer has reached its redemption limit"),
    // safe to show directly to the customer.
    return { error: error.message };
  }

  revalidatePath("/my-offers");
  return { success: true, claim: data?.[0] ?? null };
}

export async function getMyClaimedOffers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("claimed_offers")
    .select(
      `
      id, code, status, claimed_at, redeemed_at,
      promotions ( title, description ),
      shops ( name, address, city )
    `
    )
    .eq("customer_id", user.id)
    .order("claimed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Suggestion prizes earned from having the #1 voted suggestion a
// business implemented — redeemable ONLY at that specific business.
export async function getMySuggestionPrizes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("suggestion_prizes")
    .select("id, code, prize_description, status, created_at, shops ( name )")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
