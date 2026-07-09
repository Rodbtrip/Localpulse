import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/actions/shop";
import { getUnreadNotifications, markNotificationsRead } from "@/lib/actions/notifications";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function DashboardOverviewPage() {
  const shop = await getMyShop();

  if (!shop) {
    return (
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
          Welcome to LocalPulse
        </h1>
        <p className="mb-6 text-ink/70">
          Set up your shop profile to start creating promotions.
        </p>
        <Link href="/dashboard/shop">
          <Button>Set up your shop</Button>
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  const { count: activePromotions } = await supabase
    .from("promotions")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  const { count: totalClaims } = await supabase
    .from("claimed_offers")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id);

  const { count: totalRedemptions } = await supabase
    .from("redemptions")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id);

  const claims = totalClaims ?? 0;
  const redemptions = totalRedemptions ?? 0;
  const redemptionRate = claims > 0 ? Math.round((redemptions / claims) * 100) : 0;

  const notifications = await getUnreadNotifications();
  if (notifications.length > 0) {
    await markNotificationsRead(notifications.map((n) => n.id));
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        {shop.name}
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        {shop.is_active ? (
          "Live and visible to customers"
        ) : (
          <>
            Not visible to customers yet —{" "}
            <Link href="/dashboard/billing" className="font-semibold text-coral underline-offset-2 hover:underline">
              subscribe to go live
            </Link>
          </>
        )}
      </p>

      {notifications.length > 0 && (
        <div className="mb-8 space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className="border-pulse/40 bg-pulse/5">
              <p className="flex items-start gap-2 text-sm font-medium text-ink">
                <span className="pulse-dot mt-1" aria-hidden="true" />
                {n.message}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Active promotions</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {activePromotions ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Offers claimed</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{claims}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Redeemed in-store</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{redemptions}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Redemption rate</p>
          <p className="mt-2 font-display text-3xl font-semibold text-coral">{redemptionRate}%</p>
        </Card>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard/promotions/new">
          <Button>Create a promotion</Button>
        </Link>
        <Link href="/dashboard/redemptions">
          <Button variant="secondary">Redeem a code</Button>
        </Link>
      </div>
    </div>
  );
}
