// CoffeeConnect OS — client-side claim call (corrected)
//
// The original blueprint inserted directly into claimed_offers from
// the client with no atomic max_redemptions check and an unsafe code
// generator. This now calls the claim_offer() database function
// (see rpc-functions.sql), which handles locking, the redemption-limit
// check, and collision-safe code generation server-side.

import { supabase } from "./supabase";

export async function claimOffer(promotionId: string) {
  const { data, error } = await supabase.rpc("claim_offer", {
    p_promotion_id: promotionId,
  });

  if (error) {
    // Errors here are the human-readable messages raised inside the
    // SQL function (e.g. "This offer has reached its redemption limit"),
    // safe to show directly to the customer.
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}
