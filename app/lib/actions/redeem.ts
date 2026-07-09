"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Calls the redeem-offer Edge Function from the corrected blueprint,
// which verifies shop ownership server-side before redeeming — this
// action does not touch claimed_offers directly.
//
// Suggestion prizes (codes prefixed "SP-") are routed to a different
// path: redeem_suggestion_prize() only lets the SPECIFIC business that
// configured the prize redeem it — unlike a platform-wide credit, this
// is a reward the business itself is giving away.
export async function redeemCode(
  _prevState: { error?: string; success?: boolean; prizeDescription?: string } | undefined,
  formData: FormData
) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const amountSpentRaw = String(formData.get("amountSpent") ?? "");

  if (!code) return { error: "Enter a redemption code." };

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: "You must be signed in." };

  if (code.startsWith("SP-")) {
    const { data, error } = await supabase.rpc("redeem_suggestion_prize", { p_code: code });
    if (error) return { error: error.message };

    revalidatePath("/dashboard/redemptions");
    revalidatePath("/dashboard");
    return { success: true, prizeDescription: data?.[0]?.prize_description };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/redeem-offer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        code,
        amountSpent: amountSpentRaw ? Number(amountSpentRaw) : undefined,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { error: result.error ?? "Redemption failed." };
  }

  revalidatePath("/dashboard/redemptions");
  revalidatePath("/dashboard");
  return { success: true };
}
