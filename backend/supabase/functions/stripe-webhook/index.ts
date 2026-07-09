// LocalPulse — Stripe webhook handler
//
// Listens for subscription lifecycle events from Stripe. On the FIRST
// time a shop's subscription becomes active:
//   1. Marks the shop's subscription active in the database
//   2. If that shop was referred by another shop, awards the
//      referring shop a REAL Stripe balance credit (a negative balance
//      transaction) equal to one month's subscription price — this
//      actually reduces the referring business's next invoice, it's
//      not just a number shown in the dashboard.
//   3. Logs the credit via record_referral_credit() for dashboard display
//
// Deploy with: supabase functions deploy stripe-webhook
// Then register this function's URL as a webhook endpoint in your
// Stripe Dashboard, listening for: customer.subscription.created,
// customer.subscription.updated

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const monthlyPriceCents = Number(Deno.env.get("LOCALPULSE_MONTHLY_PRICE_CENTS") ?? "4900"); // $49.00 default

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const shopId = session.client_reference_id;

      if (shopId && session.subscription && session.customer) {
        // Creates the link between this shop and its new Stripe
        // subscription — customer.subscription.created below then finds
        // this row and activates it.
        await adminClient.from("subscriptions").upsert(
          {
            shop_id: shopId,
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: String(session.subscription),
            plan: "standard",
            status: "pending",
          },
          { onConflict: "shop_id" }
        );
      }

      return new Response("ok", { status: 200 });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === "active" || subscription.status === "trialing";

      // Find which shop this Stripe subscription belongs to
      const { data: subRow } = await adminClient
        .from("subscriptions")
        .select("shop_id, status")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (!subRow) {
        console.warn("No local subscription row found for", subscription.id);
        return new Response("ok", { status: 200 });
      }

      const wasAlreadyActive = subRow.status === "active";

      await adminClient
        .from("subscriptions")
        .update({ status: isActive ? "active" : subscription.status })
        .eq("stripe_subscription_id", subscription.id);

      await adminClient
        .from("shops")
        .update({ is_active: isActive })
        .eq("id", subRow.shop_id);

      // Only fire the referral credit the FIRST time this shop's
      // subscription becomes active — never on renewals or repeat updates
      if (isActive && !wasAlreadyActive) {
        const { data: recorded } = await adminClient.rpc("record_referral_credit", {
          p_referred_shop_id: subRow.shop_id,
          p_amount: monthlyPriceCents / 100,
        });

        if (recorded) {
          const { data: referredShop } = await adminClient
            .from("shops")
            .select("referred_by_shop_id")
            .eq("id", subRow.shop_id)
            .single();

          if (referredShop?.referred_by_shop_id) {
            const { data: referringSub } = await adminClient
              .from("subscriptions")
              .select("stripe_customer_id")
              .eq("shop_id", referredShop.referred_by_shop_id)
              .maybeSingle();

            if (referringSub?.stripe_customer_id) {
              // The actual reward: a real Stripe balance credit that
              // reduces the referring business's NEXT invoice.
              await stripe.customers.createBalanceTransaction(
                referringSub.stripe_customer_id,
                {
                  amount: -monthlyPriceCents, // negative = credit
                  currency: "usd",
                  description: "LocalPulse referral reward — one free month",
                }
              );
            }
          }
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Webhook handler error", { status: 500 });
  }
});
