import { notFound } from "next/navigation";
import { getShopWithPromotions } from "@/lib/actions/browse";
import { Card } from "@/components/ui/Card";
import ClaimButton from "./ClaimButton";
import SuggestDealForm from "./SuggestDealForm";
import TopSuggestions from "./TopSuggestions";

function formatWindow(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Date(start).toLocaleString(undefined, opts)} – ${new Date(end).toLocaleString(
    undefined,
    opts
  )}`;
}

export default async function ShopDetailPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const result = await getShopWithPromotions(shopId);

  if (!result) notFound();
  const { shop, promotions } = result;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
        {shop.category}
      </p>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">{shop.name}</h1>
      <p className="mb-8 text-sm text-ink/60">
        {shop.address}
        {shop.address && (shop.city || shop.state) ? ", " : ""}
        {shop.city}
        {shop.city && shop.state ? ", " : ""}
        {shop.state}
      </p>

      {shop.description && <p className="mb-8 text-ink/80">{shop.description}</p>}

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Active offers</h2>

      {promotions.length === 0 ? (
        <Card className="text-center text-sm text-ink/60">
          No active offers right now — check back later.
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <Card key={promo.id}>
              <p className="font-display text-lg font-semibold text-ink">{promo.title}</p>
              {promo.description && (
                <p className="mt-1 text-sm text-ink/70">{promo.description}</p>
              )}
              <p className="mt-2 text-xs text-ink/50">
                {formatWindow(promo.start_time, promo.end_time)}
                {promo.max_redemptions ? ` · Limited to ${promo.max_redemptions}` : ""}
              </p>
              <ClaimButton promotionId={promo.id} />
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        {shop.suggestion_reward ? (
          <>
            <Card className="mb-4 border-coral/30 bg-coral/5">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
                What you're voting for
              </p>
              <p className="font-display text-lg font-semibold text-ink">
                🏆 {shop.suggestion_reward}
              </p>
              <p className="mt-1 text-sm text-ink/60">
                Goes to whoever submitted the #1 voted suggestion once {shop.name} acts on it.
              </p>
            </Card>
            <TopSuggestions shopId={shop.id} />
            <SuggestDealForm shopId={shop.id} />
          </>
        ) : (
          <Card className="text-center text-sm text-ink/60">
            {shop.name} hasn't set up a suggestion reward yet — check back later to share your
            ideas.
          </Card>
        )}
      </div>
    </div>
  );
}
