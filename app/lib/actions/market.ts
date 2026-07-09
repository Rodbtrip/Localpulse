"use server";

import { createClient } from "@/lib/supabase/server";

export type MarketPromotion = {
  shop_id: string;
  shop_name: string;
  category: string;
  city: string | null;
  state: string | null;
  distance_meters: number | null;
  promotion_id: string;
  promo_title: string;
  promo_description: string | null;
  discount_type: string;
  discount_value: number | null;
  start_time: string;
  end_time: string;
};

export async function getMarketPromotions(
  shopId: string,
  category: string | null,
  radiusMeters: number | null
): Promise<MarketPromotion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_market_promotions", {
    p_shop_id: shopId,
    p_category: category,
    p_radius_meters: radiusMeters,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}
