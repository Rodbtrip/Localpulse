"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMySubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!shop) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan")
    .eq("shop_id", shop.id)
    .maybeSingle();

  return subscription;
}
