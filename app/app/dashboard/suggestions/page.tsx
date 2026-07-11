import Link from "next/link";
import { getMyShop } from "@/lib/actions/shop";
import { getShopSuggestions } from "@/lib/actions/suggestions";
import { Card } from "@/components/ui/Card";
import SuggestionStatusButtons from "./SuggestionStatusButtons";
import FeatureToggle from "./FeatureToggle";

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function SuggestionsPage() {
  const shop = await getMyShop();

  if (!shop) {
    return (
      <Card className="max-w-lg text-center text-sm text-ink/60">
        Set up your shop profile first — customer suggestions will show up here once you're live.
      </Card>
    );
  }

  const suggestions = await getShopSuggestions(shop.id);
  const featuredCount = suggestions.filter((s: any) => s.featured).length;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Deal Contest
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        Deal and special ideas submitted directly by nearby customers. Pick up to 3 to put up
        for a public customer vote — everything else stays visible here, just not votable yet.
      </p>

      {!shop.suggestion_reward && (
        <Card className="mb-6 border-coral/30 bg-coral/5">
          <p className="font-display text-base font-semibold text-ink">
            Set a prize to start collecting suggestions
          </p>
          <p className="mt-1 text-sm text-ink/60">
            Customers can only submit suggestions to businesses offering something in
            return — it's what makes it worth their time to share ideas, and it's how you
            turn a good idea into a loyal customer.
          </p>
          <Link
            href="/dashboard/shop"
            className="mt-3 inline-block text-sm font-semibold text-coral underline-offset-2 hover:underline"
          >
            Set your prize in Business profile →
          </Link>
        </Card>
      )}

      {suggestions.length > 0 && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/50">
          {featuredCount} / 3 featured for public voting
        </p>
      )}

      {suggestions.length === 0 ? (
        <Card className="text-center text-sm text-ink/60">
          No suggestions yet — they'll show up here as customers submit ideas from your shop
          page.
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s: any) => (
            <Card
              key={s.id}
              className={s.featured ? "border-coral/40 bg-coral/5" : undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-ink">{s.suggestion}</p>
                  <p className="mt-2 text-xs text-ink/50">
                    {s.profiles?.full_name ?? "A customer"} · {timeAgo(s.created_at)}
                    {s.featured && s.status !== "implemented" && (
                      <>
                        {" · "}
                        <span className="font-semibold text-coral">
                          Votes hidden until contest ends
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <FeatureToggle id={s.id} shopId={shop.id} featured={s.featured} />
                  <SuggestionStatusButtons id={s.id} status={s.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
