"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_VALUES } from "@/lib/categories";

export async function getMyShop() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertShop(_prevState: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Shop name is required." };

  const category = String(formData.get("category") ?? "");
  if (!CATEGORY_VALUES.includes(category as (typeof CATEGORY_VALUES)[number])) {
    return { error: "Choose a business category." };
  }

  const shopId = String(formData.get("shopId") ?? "");

  const payload: Record<string, unknown> = {
    owner_id: user.id,
    name,
    category,
    description: String(formData.get("description") ?? ""),
    suggestion_reward: String(formData.get("suggestionReward") ?? "").trim() || null,
    suggestion_contest_ends_at: formData.get("contestEndsAt")
      ? new Date(String(formData.get("contestEndsAt"))).toISOString()
      : null,
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    zip: String(formData.get("zip") ?? ""),
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
  };

  // Only on first creation (not editing an existing shop): resolve any
  // referral code entered at sign-up into an actual referring shop.
  if (!shopId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pending_referral_code")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.pending_referral_code) {
      const { data: referringShop } = await supabase
        .from("shops")
        .select("id")
        .eq("referral_code", profile.pending_referral_code)
        .maybeSingle();

      if (referringShop) {
        payload.referred_by_shop_id = referringShop.id;
      }
      await supabase.from("profiles").update({ pending_referral_code: null }).eq("id", user.id);
    }
  }

  const { error } = shopId
    ? await supabase.from("shops").update(payload).eq("id", shopId).eq("owner_id", user.id)
    : await supabase.from("shops").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/shop");
  revalidatePath("/dashboard");
  return { success: true };
}
