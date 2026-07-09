"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReferralData(shopId: string, referralCode: string) {
  const supabase = await createClient();

  // Note: we don't embed the referred shop's subscription status here —
  // RLS correctly blocks a referring owner from reading another shop's
  // subscription details, since they don't own it. Whether a referral
  // actually converted is instead derived from referral_credits below,
  // which only exists once a real credit was awarded.
  const { data: referredShops } = await supabase
    .from("shops")
    .select("id, name, created_at")
    .eq("referred_by_shop_id", shopId);

  const { data: credits } = await supabase
    .from("referral_credits")
    .select("id, referred_shop_id, amount_credited, created_at, shops:referred_shop_id ( name )")
    .eq("referring_shop_id", shopId)
    .order("created_at", { ascending: false });

  const convertedShopIds = new Set((credits ?? []).map((c) => c.referred_shop_id));

  return {
    referredShops: (referredShops ?? []).map((s) => ({
      ...s,
      converted: convertedShopIds.has(s.id),
    })),
    credits: credits ?? [],
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/sign-up?ref=${referralCode}`,
  };
}
