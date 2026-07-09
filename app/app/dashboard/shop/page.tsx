import { getMyShop, upsertShop } from "@/lib/actions/shop";
import ShopForm from "./ShopForm";

export default async function ShopProfilePage() {
  const shop = await getMyShop();

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Shop profile
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        {shop
          ? "Update your shop's details below."
          : "This information appears to customers browsing nearby offers."}
      </p>
      <ShopForm shop={shop} action={upsertShop} />
    </div>
  );
}
