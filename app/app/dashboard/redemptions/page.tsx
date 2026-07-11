"use client";

import { useFormState } from "react-dom";
import { redeemCode } from "@/lib/actions/redeem";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label } from "@/components/ui/Input";
import { Card, PulseCode } from "@/components/ui/Card";

export default function RedeemPage() {
  const [state, formAction] = useFormState(redeemCode, undefined);

  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Redeem a code
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        Enter the code your customer shows you at the counter. This also accepts suggestion
        prize codes (starting "SP-") for winning suggestions your business awarded.
      </p>

      <Card>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="code">Redemption code</Label>
            <Input
              id="code"
              name="code"
              required
              autoFocus
              autoComplete="off"
              placeholder="A1B2C3D4"
              className="font-mono uppercase tracking-widest"
            />
          </div>

          <div>
            <Label htmlFor="amountSpent">Amount spent (optional)</Label>
            <Input
              id="amountSpent"
              name="amountSpent"
              type="number"
              step="0.01"
              min="0"
              placeholder="4.50"
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-rose">
              {state.error}
            </p>
          )}

          <SubmitButton pendingText="Checking…" className="w-full">
            Redeem
          </SubmitButton>
        </form>
      </Card>

      {state?.success && (
        <div className="mt-6 text-center">
          <p className="mb-3 text-sm font-medium text-pulse">
            {state.prizeDescription
              ? `Honored prize: ${state.prizeDescription}`
              : "Redeemed successfully"}
          </p>
          <PulseCode code="✓ REDEEMED" />
        </div>
      )}
    </div>
  );
}
