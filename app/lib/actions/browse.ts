"use server";

import { createClient } from "@/lib/supabase/server";

export type NearbyShop = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  distance_meters: number;
  active_promotion_count: number;
};

// Radius is in meters; ~8000m (~5 miles) is a reasonable default for
// "local, walkable-or-short-drive" businesses.
export async function getNearbyShops(
  lat: number,
  lng: number,
  category: string | null,
  radiusMeters = 8000
): Promise<NearbyShop[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("nearby_shops", {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: radiusMeters,
    p_category: category,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getShopWithPromotions(shopId: string) {
  const supabase = await createClient();

  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .eq("is_active", true)
    .single();

  if (shopError || !shop) return null;

  const { data: promotions } = await supabase
    .from("promotions")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .lte("start_time", new Date().toISOString())
    .gte("end_time", new Date().toISOString())
    .order("end_time", { ascending: true });

  return { shop, promotions: promotions ?? [] };
}
