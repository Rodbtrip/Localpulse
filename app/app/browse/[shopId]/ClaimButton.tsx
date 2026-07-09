"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { claimPromotion } from "@/lib/actions/claim";
import { Button } from "@/components/ui/Button";
import { PulseCode } from "@/components/ui/Card";

export default function ClaimButton({ promotionId }: { promotionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; code?: string } | null>(null);

  function handleClaim() {
    startTransition(async () => {
      const res = await claimPromotion(promotionId);
      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ code: res.claim?.code });
      }
    });
  }

  if (result?.code) {
    return (
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-pulse">Claimed! Show this at checkout:</p>
        <PulseCode code={result.code} />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button onClick={handleClaim} disabled={isPending}>
        {isPending ? "Claiming…" : "Claim this offer"}
      </Button>
      {result?.error === "Sign in to claim this offer." && (
        <p className="mt-2 text-sm text-ink/60">
          <Link href="/join" className="font-semibold text-coral underline-offset-2 hover:underline">
            Create a free account
          </Link>{" "}
          to claim offers.
        </p>
      )}
      {result?.error && result.error !== "Sign in to claim this offer." && (
        <p className="mt-2 text-sm text-rose">{result.error}</p>
      )}
    </div>
  );
}
