// CoffeeConnect OS — client-side redeem call (corrected)
//
// The original blueprint updated claimed_offers directly from the
// client with no check that the caller owned the shop the code
// belonged to. This now calls the redeem-offer Edge Function, which
// verifies shop ownership server-side before redeeming.

import { supabase } from "./supabase";

export async function redeemOffer(code: string, amountSpent?: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("You must be signed in to redeem a code.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/redeem-offer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code, amountSpent }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Redemption failed.");
  }

  return result;
}
