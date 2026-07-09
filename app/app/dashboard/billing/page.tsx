import { getMyShop } from "@/lib/actions/shop";
import { getMySubscription } from "@/lib/actions/billing";
import { Card } from "@/components/ui/Card";
import CheckoutButton from "./CheckoutButton";

export default async function BillingPage() {
  const shop = await getMyShop();
  const subscription = shop ? await getMySubscription() : null;

  if (!shop) {
    return (
      <Card className="max-w-lg text-center text-sm text-ink/60">
        Set up your business profile first, then come back here to subscribe.
      </Card>
    );
  }

  const isActive = subscription?.status === "active";

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Billing</h1>
      <p className="mb-8 text-sm text-ink/60">
        Your LocalPulse subscription — required to appear live to customers.
      </p>

      <Card>
        <p className="font-display text-lg font-semibold text-ink">LocalPulse Business</p>
        <p className="mt-1 mb-4 font-display text-3xl font-semibold text-ink">
          $49<span className="text-base font-normal text-ink/50">/mo</span>
        </p>
        <ul className="mb-6 space-y-2 text-sm text-ink/70">
          <li>— Unlimited promotions</li>
          <li>— Customer suggestion box with prize contests</li>
          <li>— Market explore view</li>
          <li>— Referral rewards: earn a free month for every business you refer</li>
        </ul>

        {isActive ? (
          <div className="rounded-sm bg-pulse/10 px-4 py-3 text-sm font-medium text-pulse">
            <span className="pulse-dot mr-2" aria-hidden="true" />
            Active subscription
          </div>
        ) : (
          <CheckoutButton shopId={shop.id} />
        )}
      </Card>
    </div>
  );
}
