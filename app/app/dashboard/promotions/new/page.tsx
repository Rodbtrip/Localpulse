"use client";

import { useActionState } from "react";
import { createPromotion } from "@/lib/actions/promotions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export default function NewPromotionPage() {
  const [state, formAction, pending] = useActionState(createPromotion, undefined);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Create a promotion
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        Customers can claim this while it&apos;s active and within its time window.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Half-off afternoon lattes" />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Any details customers should know before redeeming."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="discountType">Discount type</Label>
            <select
              id="discountType"
              name="discountType"
              defaultValue="percent"
              className="focus-ring w-full rounded-sm border border-line bg-white px-3.5 py-2.5 text-sm text-ink"
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="bogo">Buy one, get one</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <Label htmlFor="discountValue">Value</Label>
            <Input
              id="discountValue"
              name="discountValue"
              type="number"
              step="any"
              min="0"
              placeholder="50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startTime">Starts</Label>
            <Input id="startTime" name="startTime" type="datetime-local" required />
          </div>
          <div>
            <Label htmlFor="endTime">Ends</Label>
            <Input id="endTime" name="endTime" type="datetime-local" required />
          </div>
        </div>

        <div>
          <Label htmlFor="maxRedemptions">Redemption limit (optional)</Label>
          <Input
            id="maxRedemptions"
            name="maxRedemptions"
            type="number"
            min="1"
            placeholder="Leave blank for no limit"
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-rose">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create promotion"}
        </Button>
      </form>
    </div>
  );
}
