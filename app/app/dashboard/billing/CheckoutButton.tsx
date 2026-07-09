"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/Button";

// ============================================================
// STRIPE CHECKOUT — LocalPulse's own subscription
// ============================================================
// 1. Replace NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local with your
//    real Stripe publishable key.
// 2. Create ONE recurring monthly Price in Stripe Dashboard → Product
//    catalog (e.g. "LocalPulse Business" — $49/mo), then replace
//    STRIPE_PRICE_ID below with that Price ID.
// 3. Set client_reference_id to the shop's id so the webhook can link
//    the resulting Stripe subscription back to this specific business
//    — this is what makes the referral credit system work.
// ============================================================
const STRIPE_PRICE_ID = "price_REPLACE_WITH_LOCALPULSE_PRICE_ID";

export default function CheckoutButton({ shopId }: { shopId: string }) {
  async function handleCheckout() {
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
    if (!stripe) {
      alert("Stripe isn't configured yet — add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local.");
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      clientReferenceId: shopId,
      successUrl: `${window.location.origin}/dashboard/billing?success=true`,
      cancelUrl: window.location.href,
    });

    if (error) alert(error.message);
  }

  return (
    <Button onClick={handleCheckout} className="w-full">
      Subscribe — $49/mo
    </Button>
  );
}
