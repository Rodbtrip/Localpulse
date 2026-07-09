"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getMyPromotions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return [];

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPromotion(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return { error: "Set up your shop profile before creating a promotion." };

  const title = String(formData.get("title") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!title || !startTime || !endTime) {
    return { error: "Title, start time, and end time are required." };
  }
  if (new Date(endTime) <= new Date(startTime)) {
    return { error: "End time must be after start time." };
  }

  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "");

  const { error } = await supabase.from("promotions").insert({
    shop_id: shop.id,
    title,
    description: String(formData.get("description") ?? ""),
    discount_type: String(formData.get("discountType") ?? "percent"),
    discount_value: Number(formData.get("discountValue") ?? 0),
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    max_redemptions: maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/promotions");
  redirect("/dashboard/promotions");
}

export async function togglePromotionActive(promotionId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("promotions")
    .update({ is_active: isActive })
    .eq("id", promotionId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/promotions");
}
