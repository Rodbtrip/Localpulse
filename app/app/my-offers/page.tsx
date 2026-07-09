import Link from "next/link";
import { getMyClaimedOffers, getMySuggestionPrizes } from "@/lib/actions/claim";
import { getUnreadNotifications, markNotificationsRead } from "@/lib/actions/notifications";
import { Card, PulseCode } from "@/components/ui/Card";

export default async function MyOffersPage() {
  const [offers, prizes, notifications] = await Promise.all([
    getMyClaimedOffers(),
    getMySuggestionPrizes(),
    getUnreadNotifications(),
  ]);

  // Mark as read once shown — behaves like a toast that persists until
  // the customer actually visits this page, rather than disappearing
  // instantly or staying forever.
  if (notifications.length > 0) {
    await markNotificationsRead(notifications.map((n) => n.id));
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">Your wallet</p>
      <h1 className="mb-8 font-display text-2xl font-semibold text-ink">
        Claimed offers
      </h1>

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

      {prizes.length > 0 && (
        <div className="mb-10">
          <p className="mb-3 font-display text-lg font-semibold text-ink">Suggestion prizes</p>
          <p className="mb-4 text-sm text-ink/60">
            Earned from having the #1 voted suggestion a business acted on.
          </p>
          <div className="space-y-3">
            {prizes.map((prize: any) => (
              <Card key={prize.id} className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-ink">
                    {prize.prize_description}
                  </p>
                  <p className="text-sm text-ink/60">Redeemable at {prize.shops?.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink/40">
                    {prize.status === "redeemed" ? "Redeemed" : "Ready to use"}
                  </p>
                </div>
                {prize.status !== "redeemed" && <PulseCode code={prize.code} />}
              </Card>
            ))}
          </div>
        </div>
      )}

      {offers.length === 0 ? (
        <Card className="text-center text-sm text-ink/60">
          You haven&apos;t claimed any offers yet.{" "}
          <Link href="/browse" className="font-semibold text-coral underline-offset-2 hover:underline">
            Browse what&apos;s nearby
          </Link>
          .
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">
                  {offer.promotions?.title}
                </p>
                <p className="text-sm text-ink/60">{offer.shops?.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-ink/40">
                  {offer.status === "redeemed" ? "Redeemed" : "Ready to use"}
                </p>
              </div>
              {offer.status !== "redeemed" && <PulseCode code={offer.code} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
