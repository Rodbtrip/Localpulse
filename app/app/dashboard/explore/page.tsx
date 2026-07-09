import { getMyShop } from "@/lib/actions/shop";
import { Card } from "@/components/ui/Card";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const shop = await getMyShop();

  if (!shop) {
    return (
      <Card className="max-w-lg text-center text-sm text-ink/60">
        Set up your shop profile first — you'll need it before we can show distances to other
        businesses.
      </Card>
    );
  }

  return <ExploreClient shopId={shop.id} />;
}
