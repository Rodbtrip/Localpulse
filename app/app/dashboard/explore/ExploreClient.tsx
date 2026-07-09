"use client";

import { useEffect, useState } from "react";
import { getMarketPromotions, type MarketPromotion } from "@/lib/actions/market";
import { Card } from "@/components/ui/Card";
import { FILTER_CATEGORIES } from "@/lib/categories";

const CATEGORIES: { value: string | null; label: string }[] = [
  { value: null, label: "All categories" },
  ...FILTER_CATEGORIES,
];

const NEARBY_RADIUS_METERS = 16000; // ~10 miles

function formatDistance(meters: number | null) {
  if (meters === null) return null;
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi away`;
}

function formatDiscount(type: string, value: number | null) {
  if (type === "percent") return `${value}% off`;
  if (type === "fixed") return `$${value} off`;
  if (type === "bogo") return "Buy one, get one";
  return "Custom offer";
}

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

export default function ExploreClient({ shopId }: { shopId: string }) {
  const [category, setCategory] = useState<string | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [promos, setPromos] = useState<MarketPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMarketPromotions(shopId, category, nearbyOnly ? NEARBY_RADIUS_METERS : null)
      .then(setPromos)
      .finally(() => setLoading(false));
  }, [shopId, category, nearbyOnly]);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Explore the market
      </h1>
      <p className="mb-6 text-sm text-ink/60">
        See what other businesses on LocalPulse are running right now — for ideas, and to see
        what you're up against.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            onClick={() => setCategory(c.value)}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c.value
                ? "bg-coral text-paper"
                : "border border-ink/15 text-ink/70 hover:border-ink/30"
            }`}
          >
            {c.label}
          </button>
        ))}

        <label className="ml-2 flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={nearbyOnly}
            onChange={(e) => setNearbyOnly(e.target.checked)}
            className="accent-coral"
          />
          Nearby only (~10 mi)
        </label>
      </div>

      {loading ? (
        <Card className="text-center text-sm text-ink/60">Loading…</Card>
      ) : promos.length === 0 ? (
        <Card className="text-center text-sm text-ink/60">
          No other businesses currently have active promotions matching this filter.
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => (
            <Card key={promo.promotion_id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-coral">
                    {promo.category} · {promo.shop_name}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink">
                    {promo.promo_title}
                  </p>
                  {promo.promo_description && (
                    <p className="mt-1 text-sm text-ink/70">{promo.promo_description}</p>
                  )}
                  <p className="mt-2 text-xs text-ink/50">
                    {formatDiscount(promo.discount_type, promo.discount_value)} ·{" "}
                    {formatWindow(promo.start_time, promo.end_time)}
                  </p>
                </div>
                {formatDistance(promo.distance_meters) && (
                  <span className="flex-shrink-0 text-xs font-medium text-ink/40">
                    {formatDistance(promo.distance_meters)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
