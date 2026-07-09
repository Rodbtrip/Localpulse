"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CATEGORIES } from "@/lib/categories";

type Shop = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  suggestion_reward: string | null;
  suggestion_contest_ends_at: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
} | null;

type ActionState = { error?: string; success?: boolean } | undefined;

export default function ShopForm({
  shop,
  action,
}: {
  shop: Shop;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {shop && <input type="hidden" name="shopId" value={shop.id} />}

      <div>
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" defaultValue={shop?.name ?? ""} required />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={shop?.category ?? ""}
          required
          className="focus-ring w-full rounded-sm border border-line bg-white px-3.5 py-2.5 text-sm text-ink"
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={shop?.description ?? ""}
          placeholder="What makes your shop worth a visit?"
        />
      </div>

      <div>
        <Label htmlFor="suggestionReward">Suggestion contest prize</Label>
        <Input
          id="suggestionReward"
          name="suggestionReward"
          defaultValue={shop?.suggestion_reward ?? ""}
          placeholder="e.g. Free 12oz drink of your choice"
        />
        <p className="-mt-2 mb-4 text-xs text-ink/50">
          Shown to customers so they know what they&apos;re voting for. Whoever submits the #1
          voted suggestion when you mark it &quot;Implemented&quot; gets this.
        </p>
      </div>

      <div>
        <Label htmlFor="contestEndsAt">Voting round ends</Label>
        <Input
          id="contestEndsAt"
          name="contestEndsAt"
          type="datetime-local"
          defaultValue={
            shop?.suggestion_contest_ends_at
              ? new Date(shop.suggestion_contest_ends_at).toISOString().slice(0, 16)
              : ""
          }
        />
        <p className="-mt-2 mb-4 text-xs text-ink/50">
          Required before you can feature any suggestions. When this time passes, the #1 voted
          featured suggestion is automatically awarded, published as a real promotion, and the
          round resets — this is the only way suggestion contests resolve.
        </p>
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={shop?.phone ?? ""} />
      </div>

      <div>
        <Label htmlFor="address">Street address</Label>
        <Input id="address" name="address" defaultValue={shop?.address ?? ""} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={shop?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={shop?.state ?? ""} />
        </div>
        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={shop?.zip ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            defaultValue={shop?.latitude ?? ""}
            placeholder="39.4143"
          />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            defaultValue={shop?.longitude ?? ""}
            placeholder="-77.4105"
          />
        </div>
      </div>
      <p className="text-xs text-ink/50">
        Used for the customer app&apos;s &quot;nearby shops&quot; search. Look up your address on
        Google Maps and copy the coordinates from the URL.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm text-rose">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-pulse">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save shop profile"}
      </Button>
    </form>
  );
}
