// ---------------------------------------------------------------------------
// delete-account Edge Function
// Permanently deletes the CALLING user's own account.
//
// Deploy:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//   supabase functions deploy delete-account
//
// Order of operations matters. Billing is cancelled FIRST, and if that
// fails the deletion is aborted — better to leave an account intact than
// to destroy it while a card is still being charged every month.
//
//   1. Verify the caller's JWT (users can only ever delete themselves).
//   2. Cancel any active Stripe subscription. Abort on failure.
//   3. Take the owned shop offline (is_active = false) so listings vanish
//      immediately even if a later step is interrupted.
//   4. Delete the profiles row (personal data).
//   5. Delete the auth user via the admin API.
//
// Review FK ON DELETE behavior: activity records (claims, votes,
// suggestions) either cascade or remain with a dangling user id — confirm
// the retention outcome matches the Privacy Policy.
// ---------------------------------------------------------------------------
import { createClient } from "npm:@supabase/supabase-js@2";

// Subscription states where Stripe is still capable of charging the card.
// `canceled` and `incomplete_expired` are terminal; nothing to do.
const BILLABLE = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

// Cancels immediately (not at period end) — the account is being destroyed,
// so there is no one left to serve for the remainder of the period.
// Returns null on success, or a human-readable reason on failure.
async function cancelStripeSubscription(subscriptionId: string): Promise<string | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    return "Billing is not configured on the server, so your subscription could not be cancelled.";
  }

  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Safe to retry: Stripe collapses duplicate calls with the same key.
      "Idempotency-Key": `delete-account:${subscriptionId}`,
    },
  });

  if (res.ok) return null;

  // A subscription that is already gone is a success, not a failure.
  if (res.status === 404) return null;
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.error?.message) detail = body.error.message;
    if (body?.error?.code === "resource_missing") return null;
  } catch {
    /* keep the status-code fallback */
  }
  return `Your subscription could not be cancelled (${detail}). Nothing was deleted.`;
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    // 1. Only ever delete the authenticated caller.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Not signed in." }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Cancel billing BEFORE destroying anything.
    const { data: shop } = await admin
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (shop) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("shop_id", shop.id)
        .maybeSingle();

      if (sub?.stripe_subscription_id && BILLABLE.has(sub.status)) {
        const failure = await cancelStripeSubscription(sub.stripe_subscription_id);
        if (failure) {
          // Abort. An account that still bills is worse than one that still exists.
          return json({ error: failure }, 409);
        }
        await admin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("shop_id", shop.id);
      }

      // 3. Listings offline immediately.
      await admin.from("shops").update({ is_active: false }).eq("id", shop.id);
    }

    // 4. Personal data.
    await admin.from("profiles").delete().eq("id", user.id);

    // 5. The auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
