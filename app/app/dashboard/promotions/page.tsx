import Link from "next/link";
import { getMyPromotions } from "@/lib/actions/promotions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PromotionToggle from "./PromotionToggle";

function formatWindow(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return `${new Date(start).toLocaleString(undefined, opts)} – ${new Date(end).toLocaleString(undefined, opts)}`;
}

export default async function PromotionsPage() {
  const promotions = await getMyPromotions();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Promotions</h1>
          <p className="text-sm text-ink/60">Time-based offers customers can claim.</p>
        </div>
        <Link href="/dashboard/promotions/new">
          <Button>Create a promotion</Button>
        </Link>
      </div>

      {promotions.length === 0 ? (
        <Card className="text-center">
          <p className="text-ink/70">No promotions yet.</p>
          <p className="mt-1 text-sm text-ink/50">
            Create one to start bringing customers in during slow hours.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <Card key={promo.id} className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{promo.title}</p>
                <p className="text-sm text-ink/60">
                  {formatWindow(promo.start_time, promo.end_time)}
                  {promo.max_redemptions ? ` · Limit ${promo.max_redemptions}` : " · No limit"}
                </p>
              </div>
              <PromotionToggle id={promo.id} isActive={promo.is_active} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
