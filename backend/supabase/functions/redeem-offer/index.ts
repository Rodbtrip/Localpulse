// CoffeeConnect OS — redeem-offer Edge Function (new file)
//
// Fixes a missing authorization check from the original blueprint:
// the original redeemOffer() sample ran client-side against the anon
// key with no verification that the caller actually owned the shop
// the code belonged to. This function runs server-side, confirms the
// caller's identity from their JWT, then explicitly checks that the
// authenticated owner's shop_id matches the claimed offer's shop_id
// before allowing the redemption to proceed.
//
// Deploy with: supabase functions deploy redeem-offer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const { code, amountSpent } = await req.json();
    if (!code || typeof code !== "string") {
      return json({ error: "Missing redemption code" }, 400);
    }

    // Client scoped to the caller's own JWT — used only to securely
    // identify who is making the request.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const ownerId = authData.user.id;

    // Service-role client for the privileged reads/writes below — safe
    // to use now that we've verified who the caller is, above.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: claimedOffer, error: fetchError } = await adminClient
      .from("claimed_offers")
      .select("id, shop_id, customer_id, status")
      .eq("code", code)
      .eq("status", "claimed")
      .single();

    if (fetchError || !claimedOffer) {
      return json({ error: "Invalid or already-redeemed code" }, 404);
    }

    // The missing check from the original sample: confirm the caller
    // actually owns the shop this code belongs to.
    const { data: shop, error: shopError } = await adminClient
      .from("shops")
      .select("id, owner_id")
      .eq("id", claimedOffer.shop_id)
      .single();

    if (shopError || !shop) {
      return json({ error: "Shop not found" }, 404);
    }
    if (shop.owner_id !== ownerId) {
      return json({ error: "You do not have permission to redeem this code" }, 403);
    }

    const { data: updatedRows, error: updateError } = await adminClient
      .from("claimed_offers")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
      .eq("id", claimedOffer.id)
      .eq("status", "claimed") // guards against a double-redeem race
      .select("id");

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    // If zero rows came back, another request already redeemed this exact
    // code between our SELECT above and this UPDATE — the .eq("status",
    // "claimed") guard caused this UPDATE to match nothing. Stop here.
    // Without this check, a second concurrent scan would silently insert
    // a duplicate row into `redemptions` below and report false success.
    if (!updatedRows || updatedRows.length === 0) {
      return json({ error: "This code was already redeemed, moments ago." }, 409);
    }

    const { error: redemptionError } = await adminClient
      .from("redemptions")
      .insert({
        claimed_offer_id: claimedOffer.id,
        shop_id: claimedOffer.shop_id,
        customer_id: claimedOffer.customer_id,
        amount_spent: amountSpent ?? null,
      });

    if (redemptionError) {
      return json({ error: redemptionError.message }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: "Unexpected server error" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
