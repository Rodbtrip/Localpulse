import { getMyShop } from "@/lib/actions/shop";
import { getReferralData } from "@/lib/actions/referrals";
import { Card } from "@/components/ui/Card";
import CopyLinkButton from "./CopyLinkButton";

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function ReferralsPage() {
  const shop = await getMyShop();

  if (!shop) {
    return (
      <Card className="max-w-lg text-center text-sm text-ink/60">
        Set up your business profile first — you'll get a referral code once it's created.
      </Card>
    );
  }

  const { referredShops, credits, referralLink } = await getReferralData(
    shop.id,
    shop.referral_code
  );
  const totalFreeMonths = credits.length;

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Referrals</h1>
      <p className="mb-8 text-sm text-ink/60">
        Refer other businesses to LocalPulse. When they subscribe, you get a free month —
        automatically applied to your next bill.
      </p>

      <Card className="mb-6 border-coral/30 bg-coral/5">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
          Your referral link
        </p>
        <p className="mb-3 break-all font-mono text-sm text-ink">{referralLink}</p>
        <CopyLinkButton link={referralLink} />
        <p className="mt-3 text-xs text-ink/50">
          Or share your code directly: <span className="font-mono font-semibold">{shop.referral_code}</span>
        </p>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Businesses referred</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {referredShops.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink/50">Free months earned</p>
          <p className="mt-2 font-display text-2xl font-semibold text-pulse">
            {totalFreeMonths}
          </p>
        </Card>
      </div>

      <p className="mb-3 font-display text-base font-semibold text-ink">Referred businesses</p>
      {referredShops.length === 0 ? (
        <Card className="text-center text-sm text-ink/60">
          No referrals yet — share your link above to start earning free months.
        </Card>
      ) : (
        <div className="space-y-2">
          {referredShops.map((s: any) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink/50">Joined {timeAgo(s.created_at)}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  s.converted ? "bg-pulse/15 text-pulse" : "bg-ink/10 text-ink/50"
                }`}
              >
                {s.converted ? "Subscribed ✓" : "Pending"}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
