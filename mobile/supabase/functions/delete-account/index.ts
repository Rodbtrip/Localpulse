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
//   2. Cancel every billable Stripe subscription across ALL of the caller's
//      shops (owner_id is not unique — one owner can have several shops).
//      Abort on any failure.
//   3. Take the owned shops offline (is_active = false) so listings vanish
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

  // Cancelling a subscription that is already terminal (e.g. cancelled from
  // the Stripe dashboard while our local status row is stale) fails with
  // HTTP 400, not 404. Before treating that as a hard failure, fetch the
  // subscription: if Stripe itself reports a terminal status, it can no
  // longer bill and there is nothing left to cancel. Anything else — a
  // still-billable status, or a verification fetch that fails — stays a
  // failure, because we could not confirm billing has stopped.
  try {
    const check = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (check.ok) {
      const sub = await check.json();
      if (sub?.status === "canceled" || sub?.status === "incomplete_expired") {
        return null;
      }
    }
  } catch {
    /* verification unavailable — report the original cancellation error */
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

    // 2. Cancel billing BEFORE destroying anything. owner_id is not unique,
    // so an owner can have several shops — every one of them must be checked.
    const { data: shops, error: shopsErr } = await admin
      .from("shops")
      .select("id")
      .eq("owner_id", user.id);
    if (shopsErr) {
      // Never delete an account whose billing could not even be checked.
      return json(
        { error: "Could not look up your shops to cancel billing. Nothing was deleted." },
        500,
      );
    }

    // First pass: cancel every billable subscription at Stripe. Abort before
    // any data is modified if a lookup or cancellation fails.
    const cancelledShopIds: string[] = [];
    for (const shop of shops ?? []) {
      const { data: sub, error: subErr } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("shop_id", shop.id)
        .maybeSingle();
      if (subErr) {
        return json(
          { error: "Could not look up your subscription to cancel billing. Nothing was deleted." },
          500,
        );
      }

      if (sub?.stripe_subscription_id && BILLABLE.has(sub.status)) {
        const failure = await cancelStripeSubscription(sub.stripe_subscription_id);
        if (failure) {
          // Abort. An account that still bills is worse than one that still exists.
          return json({ error: failure }, 409);
        }
        cancelledShopIds.push(shop.id);
      }
    }

    // 3. All Stripe cancellations succeeded — record them, and take listings
    // offline immediately so they vanish even if a later step is interrupted.
    for (const shop of shops ?? []) {
      if (cancelledShopIds.includes(shop.id)) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("shop_id", shop.id);
      }
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
